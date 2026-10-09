-- =====================================================================
-- Pratuca — funções de negócio confiáveis
-- Todas as regras críticas (preço, disponibilidade, taxa de entrega,
-- transições de status, acesso por assinatura) vivem aqui, no banco.
-- O frontend apenas espelha as regras para melhorar a experiência.
--
-- Erros de negócio usam SQLSTATE P0001 e uma mensagem-código estável
-- (ex.: STORE_CLOSED). O frontend traduz o código para pt-BR.
-- =====================================================================

-- A criação da loja passa por RPC (e não por INSERT direto) para que o
-- vínculo de proprietário e o período de teste sejam criados juntos.
revoke insert on public.stores from authenticated;

-- ---------------------------------------------------------------------
-- Acesso por assinatura
--   trialing  → liberado até trial_ends_at
--   active    → liberado até current_period_end + 3 dias de carência
--   past_due  → liberado até current_period_end + 3 dias de carência
--   canceled  → liberado até o fim do período já pago (current_period_end)
--   pending   → bloqueado
-- "Bloqueado" significa apenas: a loja não recebe novos pedidos públicos.
-- O painel e os dados continuam acessíveis; nada é apagado.
-- ---------------------------------------------------------------------
create or replace function private.store_has_access(p_store_id uuid, p_at timestamptz default now())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.store_id = p_store_id
      and (
        (s.status = 'trialing' and s.trial_ends_at > p_at)
        or (s.status in ('active', 'past_due')
            and (s.current_period_end is null or s.current_period_end + interval '3 days' > p_at))
        or (s.status = 'canceled' and s.current_period_end > p_at)
      )
  );
$$;

revoke all on function private.store_has_access(uuid, timestamptz) from public;

-- Exposto aos membros para exibir o estado da assinatura no painel.
create or replace function public.get_store_access(p_store_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_store_member(p_store_id) then
    raise exception 'STORE_NOT_FOUND' using errcode = 'P0001';
  end if;
  return private.store_has_access(p_store_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Slugs
-- ---------------------------------------------------------------------
create or replace function private.is_valid_slug(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'
     and p_slug !~ '--'
     and p_slug <> all (array[
       'admin', 'api', 'app', 'ajuda', 'assinatura', 'auth', 'cardapio', 'conta', 'criar-conta',
       'entrar', 'login', 'loja', 'lojas', 'movcode', 'pedido', 'pedidos', 'pratuca', 'precos',
       'privacidade', 'suporte', 'termos', 'www'
     ]);
$$;

create or replace function public.is_slug_available(p_slug text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;
  if not private.is_valid_slug(p_slug) then
    return false;
  end if;
  return not exists (
    select 1 from public.stores s
    where s.slug = p_slug
      and s.id not in (select private.my_store_ids())
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Criação da loja (etapa 1 do onboarding)
-- ---------------------------------------------------------------------
create or replace function public.create_store(p_name text, p_slug text)
returns public.stores
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_store public.stores;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.stores where owner_id = v_uid) then
    raise exception 'STORE_ALREADY_EXISTS' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception 'INVALID_STORE_NAME' using errcode = 'P0001';
  end if;
  if not private.is_valid_slug(p_slug) then
    raise exception 'INVALID_SLUG' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.stores where slug = p_slug) then
    raise exception 'SLUG_TAKEN' using errcode = 'P0001';
  end if;

  insert into public.stores (owner_id, name, slug, onboarding_step)
  values (v_uid, btrim(p_name), p_slug, 2)
  returning * into v_store;

  return v_store;
exception
  when unique_violation then
    raise exception 'SLUG_TAKEN' using errcode = 'P0001';
end;
$$;

-- ---------------------------------------------------------------------
-- Cardápio do dia vigente (fuso horário da loja)
-- ---------------------------------------------------------------------
create or replace function private.current_daily_menu_id(p_store_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select dm.id
  from public.daily_menus dm
  join public.stores s on s.id = dm.store_id
  where dm.store_id = p_store_id
    and dm.is_published
    and dm.menu_date = (now() at time zone s.timezone)::date;
$$;

revoke all on function private.current_daily_menu_id(uuid) from public;

-- ---------------------------------------------------------------------
-- Cardápio público
-- Retorna somente o necessário para o cliente final montar o pedido.
-- Não expõe owner_id, dados de clientes, pedidos ou assinatura.
-- Membros da loja conseguem ver a prévia mesmo antes de publicar.
-- ---------------------------------------------------------------------
create or replace function public.get_public_menu(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_store public.stores;
  v_is_member boolean;
  v_daily_menu_id uuid;
  v_daily jsonb;
  v_has_access boolean;
begin
  select * into v_store from public.stores where slug = lower(btrim(p_slug));
  if not found then
    return null;
  end if;

  v_is_member := (select auth.uid()) is not null and private.is_store_member(v_store.id);
  if not v_store.is_published and not v_is_member then
    return null;
  end if;

  v_has_access := private.store_has_access(v_store.id);
  v_daily_menu_id := private.current_daily_menu_id(v_store.id);

  if v_daily_menu_id is not null then
    select jsonb_build_object('date', dm.menu_date, 'title', dm.title, 'note', dm.note)
    into v_daily
    from public.daily_menus dm where dm.id = v_daily_menu_id;
  end if;

  return jsonb_build_object(
    'store', jsonb_build_object(
      'slug', v_store.slug,
      'name', v_store.name,
      'description', v_store.description,
      'welcome_message', v_store.welcome_message,
      'logo_path', v_store.logo_path,
      'whatsapp', v_store.whatsapp,
      'phone', v_store.phone,
      'address', v_store.address,
      'timezone', v_store.timezone,
      'opening_hours', v_store.opening_hours,
      'accepts_delivery', v_store.accepts_delivery,
      'accepts_pickup', v_store.accepts_pickup,
      'delivery_fee_cents', v_store.delivery_fee_cents,
      'min_order_cents', v_store.min_order_cents,
      'payment_methods', to_jsonb(v_store.payment_methods),
      'is_open', v_store.is_open,
      'is_published', v_store.is_published,
      'accepting_orders', v_store.is_open and v_store.is_published and v_has_access
    ),
    'preview', not v_store.is_published,
    'daily_menu', v_daily,
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.position, c.name)
      from public.categories c
      where c.store_id = v_store.id and c.is_active
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'category_id', p.category_id,
          'name', p.name,
          'description', p.description,
          'price_cents', coalesce(dmi.price_cents, p.price_cents),
          'image_path', p.image_path,
          'is_available', p.is_available and coalesce(dmi.is_available, true),
          'option_groups', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', g.id,
                'name', g.name,
                'min_select', g.min_select,
                'max_select', g.max_select,
                'options', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'id', o.id, 'name', o.name, 'price_cents', o.price_cents,
                      'is_available', o.is_available
                    ) order by o.position, o.name)
                  from public.product_options o where o.group_id = g.id
                ), '[]'::jsonb)
              ) order by g.position, g.name)
            from public.product_option_groups g where g.product_id = p.id
          ), '[]'::jsonb)
        ) order by coalesce(dmi.position, p.position), p.name)
      from public.products p
      left join public.categories c on c.id = p.category_id
      left join public.daily_menu_items dmi
        on dmi.daily_menu_id = v_daily_menu_id and dmi.product_id = p.id
      where p.store_id = v_store.id
        and p.is_active
        and (p.category_id is null or c.is_active)
        and (v_daily_menu_id is null or dmi.product_id is not null)
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Criação de pedido público
--
-- Entrada (p_order):
-- {
--   "customer": {"name": "...", "phone": "11987654321"},
--   "fulfillment": "delivery" | "pickup",
--   "address": {"street","number","complement","neighborhood","reference"} | null,
--   "payment_method": "pix" | "cash" | ...,
--   "change_for_cents": 5000 | null,
--   "notes": "..." | null,
--   "expected_total_cents": 4180 | null,
--   "items": [{"product_id": uuid, "quantity": 2, "notes": "...", "option_ids": [uuid]}]
-- }
--
-- Garantias:
--   * preços, adicionais, taxa e total são recalculados no servidor;
--   * o navegador não escolhe store_id (a loja vem do slug);
--   * loja precisa estar publicada, aberta e com assinatura válida;
--   * produtos/opções precisam estar ativos e disponíveis;
--   * idempotência por (loja, p_idempotency_key);
--   * limites simples contra abuso (por telefone e por loja).
-- ---------------------------------------------------------------------
create or replace function private.order_summary(p_order_id uuid, p_duplicate boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_id', o.id,
    'number', o.number,
    'status', o.status,
    'created_at', o.created_at,
    'customer_name', o.customer_name,
    'fulfillment', o.fulfillment,
    'delivery_address', o.delivery_address,
    'payment_method', o.payment_method,
    'change_for_cents', o.change_for_cents,
    'notes', o.notes,
    'subtotal_cents', o.subtotal_cents,
    'delivery_fee_cents', o.delivery_fee_cents,
    'total_cents', o.total_cents,
    'duplicate', p_duplicate,
    'store', jsonb_build_object('name', s.name, 'slug', s.slug, 'whatsapp', s.whatsapp),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'quantity', i.quantity,
        'unit_price_cents', i.unit_price_cents,
        'options_unit_cents', i.options_unit_cents,
        'options', i.options,
        'line_total_cents', i.line_total_cents,
        'notes', i.notes
      ) order by i.position)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  join public.stores s on s.id = o.store_id
  where o.id = p_order_id;
$$;

revoke all on function private.order_summary(uuid, boolean) from public;

create or replace function private.clean_text(p_value text, p_max integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(left(btrim(regexp_replace(coalesce(p_value, ''), '[[:cntrl:]]', ' ', 'g')), p_max), '');
$$;

create or replace function public.create_public_order(
  p_slug text,
  p_idempotency_key uuid,
  p_order jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_max_items constant integer := 30;
  c_phone_limit constant integer := 5;     -- pedidos por telefone por loja em 10 min
  c_store_limit constant integer := 120;   -- pedidos por loja em 10 min
  v_store public.stores;
  v_existing uuid;
  v_daily_menu_id uuid;
  v_name text;
  v_phone text;
  v_fulfillment public.fulfillment_type;
  v_payment public.payment_method;
  v_address jsonb;
  v_change integer;
  v_notes text;
  v_item jsonb;
  v_items jsonb;
  v_product record;
  v_quantity integer;
  v_option_ids uuid[];
  v_option_count integer;
  v_options jsonb;
  v_options_cents integer;
  v_group record;
  v_selected integer;
  v_line_items jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_fee integer := 0;
  v_total integer;
  v_customer_id uuid;
  v_number integer;
  v_order_id uuid;
  v_position integer := 0;
begin
  if p_idempotency_key is null then
    raise exception 'INVALID_REQUEST' using errcode = 'P0001', detail = 'idempotency_key ausente';
  end if;
  if p_order is null or jsonb_typeof(p_order) <> 'object' then
    raise exception 'INVALID_REQUEST' using errcode = 'P0001';
  end if;

  -- Loja (bloqueia a linha: serializa pedidos da mesma loja e protege a numeração)
  select * into v_store
  from public.stores
  where slug = lower(btrim(coalesce(p_slug, '')))
  for update;

  if not found or not v_store.is_published then
    raise exception 'STORE_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Idempotência: mesmo pedido reenviado retorna o registro existente
  select id into v_existing
  from public.orders
  where store_id = v_store.id and idempotency_key = p_idempotency_key;
  if found then
    return private.order_summary(v_existing, true);
  end if;

  if not private.store_has_access(v_store.id) then
    raise exception 'STORE_UNAVAILABLE' using errcode = 'P0001';
  end if;
  if not v_store.is_open then
    raise exception 'STORE_CLOSED' using errcode = 'P0001';
  end if;

  -- Cliente
  v_name := private.clean_text(p_order #>> '{customer,name}', 80);
  v_phone := regexp_replace(coalesce(p_order #>> '{customer,phone}', ''), '\D', '', 'g');
  if v_name is null or char_length(v_name) < 2 then
    raise exception 'INVALID_CUSTOMER_NAME' using errcode = 'P0001';
  end if;
  if v_phone !~ '^[0-9]{10,13}$' then
    raise exception 'INVALID_CUSTOMER_PHONE' using errcode = 'P0001';
  end if;

  -- Limites contra abuso
  if (select count(*) from public.orders
      where store_id = v_store.id and customer_phone = v_phone
        and created_at > now() - interval '10 minutes') >= c_phone_limit
     or (select count(*) from public.orders
      where store_id = v_store.id and created_at > now() - interval '10 minutes') >= c_store_limit
  then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- Modalidade
  begin
    v_fulfillment := (p_order ->> 'fulfillment')::public.fulfillment_type;
  exception when others then
    raise exception 'INVALID_FULFILLMENT' using errcode = 'P0001';
  end;
  if v_fulfillment is null
     or (v_fulfillment = 'delivery' and not v_store.accepts_delivery)
     or (v_fulfillment = 'pickup' and not v_store.accepts_pickup) then
    raise exception 'INVALID_FULFILLMENT' using errcode = 'P0001';
  end if;

  if v_fulfillment = 'delivery' then
    v_address := jsonb_build_object(
      'street', private.clean_text(p_order #>> '{address,street}', 120),
      'number', private.clean_text(p_order #>> '{address,number}', 20),
      'complement', private.clean_text(p_order #>> '{address,complement}', 60),
      'neighborhood', private.clean_text(p_order #>> '{address,neighborhood}', 60),
      'reference', private.clean_text(p_order #>> '{address,reference}', 120)
    );
    if v_address ->> 'street' is null or v_address ->> 'number' is null
       or v_address ->> 'neighborhood' is null then
      raise exception 'INVALID_ADDRESS' using errcode = 'P0001';
    end if;
    v_fee := v_store.delivery_fee_cents;
  end if;

  -- Pagamento (nenhum dado de cartão é recebido ou armazenado)
  begin
    v_payment := (p_order ->> 'payment_method')::public.payment_method;
  exception when others then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = 'P0001';
  end;
  if v_payment is null or not (v_payment = any (v_store.payment_methods)) then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = 'P0001';
  end if;

  if v_payment = 'cash' and jsonb_typeof(p_order -> 'change_for_cents') = 'number' then
    v_change := (p_order ->> 'change_for_cents')::numeric::integer;
    if v_change < 0 or v_change > 1000000 then
      raise exception 'INVALID_CHANGE' using errcode = 'P0001';
    end if;
  end if;

  v_notes := private.clean_text(p_order ->> 'notes', 500);

  -- Itens
  v_items := p_order -> 'items';
  if v_items is null or jsonb_typeof(v_items) <> 'array'
     or jsonb_array_length(v_items) = 0 then
    raise exception 'EMPTY_ORDER' using errcode = 'P0001';
  end if;
  if jsonb_array_length(v_items) > c_max_items then
    raise exception 'TOO_MANY_ITEMS' using errcode = 'P0001';
  end if;

  v_daily_menu_id := private.current_daily_menu_id(v_store.id);

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item -> 'quantity') <> 'number'
       or (v_item ->> 'quantity') !~ '^[0-9]{1,2}$' then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity < 1 or v_quantity > 99 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    if coalesce(v_item ->> 'product_id', '') !~* '^[0-9a-f-]{36}$' then
      raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001';
    end if;

    select p.id, p.name,
           coalesce(dmi.price_cents, p.price_cents) as price_cents,
           (p.is_active and p.is_available
             and (p.category_id is null or c.is_active)
             and (v_daily_menu_id is null or (dmi.product_id is not null and dmi.is_available))
           ) as orderable
    into v_product
    from public.products p
    left join public.categories c on c.id = p.category_id
    left join public.daily_menu_items dmi
      on dmi.daily_menu_id = v_daily_menu_id and dmi.product_id = p.id
    where p.id = (v_item ->> 'product_id')::uuid
      and p.store_id = v_store.id;

    if not found then
      raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001',
        detail = v_item ->> 'product_id';
    end if;
    if not v_product.orderable then
      raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001', detail = v_product.name;
    end if;

    -- Opções/adicionais
    if v_item ? 'option_ids' and jsonb_typeof(v_item -> 'option_ids') <> 'array' then
      raise exception 'INVALID_OPTIONS' using errcode = 'P0001';
    end if;
    begin
      select coalesce(array_agg(distinct x::uuid), '{}')
      into v_option_ids
      from jsonb_array_elements_text(coalesce(v_item -> 'option_ids', '[]'::jsonb)) as t(x);
    exception when others then
      raise exception 'INVALID_OPTIONS' using errcode = 'P0001';
    end;
    if cardinality(v_option_ids) > 40 then
      raise exception 'INVALID_OPTIONS' using errcode = 'P0001';
    end if;

    select count(*) into v_option_count
    from public.product_options o
    join public.product_option_groups g on g.id = o.group_id
    where o.id = any (v_option_ids)
      and g.product_id = v_product.id
      and o.is_available;
    if v_option_count <> cardinality(v_option_ids) then
      raise exception 'OPTION_UNAVAILABLE' using errcode = 'P0001', detail = v_product.name;
    end if;

    for v_group in
      select g.id, g.name, g.min_select, g.max_select
      from public.product_option_groups g
      where g.product_id = v_product.id
    loop
      select count(*) into v_selected
      from public.product_options o
      where o.group_id = v_group.id and o.id = any (v_option_ids);
      if v_selected < v_group.min_select or v_selected > v_group.max_select then
        raise exception 'INVALID_OPTIONS' using errcode = 'P0001',
          detail = v_product.name || ': ' || v_group.name;
      end if;
    end loop;

    select coalesce(jsonb_agg(jsonb_build_object(
             'group_name', g.name, 'name', o.name, 'price_cents', o.price_cents
           ) order by g.position, o.position), '[]'::jsonb),
           coalesce(sum(o.price_cents), 0)
    into v_options, v_options_cents
    from public.product_options o
    join public.product_option_groups g on g.id = o.group_id
    where o.id = any (v_option_ids);

    v_line_items := v_line_items || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'unit_price_cents', v_product.price_cents,
      'options', v_options,
      'options_unit_cents', v_options_cents,
      'quantity', v_quantity,
      'line_total_cents', (v_product.price_cents + v_options_cents) * v_quantity,
      'notes', private.clean_text(v_item ->> 'notes', 200)
    );
    v_subtotal := v_subtotal + (v_product.price_cents + v_options_cents) * v_quantity;
  end loop;

  if v_store.min_order_cents is not null and v_subtotal < v_store.min_order_cents then
    raise exception 'BELOW_MINIMUM_ORDER' using errcode = 'P0001',
      detail = v_store.min_order_cents::text;
  end if;

  v_total := v_subtotal + v_fee;

  -- O total exibido ao cliente precisa bater com o calculado no servidor.
  -- Se o cardápio mudou enquanto ele montava o carrinho, pedimos revisão.
  if jsonb_typeof(p_order -> 'expected_total_cents') = 'number'
     and (p_order ->> 'expected_total_cents')::numeric <> v_total then
    raise exception 'PRICE_CHANGED' using errcode = 'P0001', detail = v_total::text;
  end if;

  if v_payment = 'cash' and v_change is not null and v_change < v_total then
    raise exception 'INVALID_CHANGE' using errcode = 'P0001';
  end if;

  -- Cliente (minimização: apenas nome e telefone; endereço fica no pedido)
  insert into public.customers (store_id, name, phone, orders_count, last_order_at)
  values (v_store.id, v_name, v_phone, 1, now())
  on conflict (store_id, phone) do update
    set name = excluded.name,
        orders_count = public.customers.orders_count + 1,
        last_order_at = now()
  returning id into v_customer_id;

  update public.stores
  set last_order_number = last_order_number + 1
  where id = v_store.id
  returning last_order_number into v_number;

  insert into public.orders (
    store_id, number, customer_id, customer_name, customer_phone, fulfillment,
    delivery_address, payment_method, change_for_cents, notes, subtotal_cents,
    delivery_fee_cents, total_cents, idempotency_key, daily_menu_id
  ) values (
    v_store.id, v_number, v_customer_id, v_name, v_phone, v_fulfillment,
    v_address, v_payment, v_change, v_notes, v_subtotal,
    v_fee, v_total, p_idempotency_key, v_daily_menu_id
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(v_line_items)
  loop
    insert into public.order_items (
      order_id, store_id, product_id, product_name, unit_price_cents, options,
      options_unit_cents, quantity, line_total_cents, notes, position
    ) values (
      v_order_id, v_store.id, (v_item ->> 'product_id')::uuid, v_item ->> 'product_name',
      (v_item ->> 'unit_price_cents')::integer, v_item -> 'options',
      (v_item ->> 'options_unit_cents')::integer, (v_item ->> 'quantity')::integer,
      (v_item ->> 'line_total_cents')::integer, v_item ->> 'notes', v_position
    );
    v_position := v_position + 1;
  end loop;

  insert into public.order_status_history (order_id, store_id, from_status, to_status)
  values (v_order_id, v_store.id, null, 'new');

  return private.order_summary(v_order_id, false);
end;
$$;

-- ---------------------------------------------------------------------
-- Transições de status
--   Fluxo: new → confirmed → preparing → ready → out_for_delivery → completed
--   * só avança (pode pular etapas, ex.: new → preparing);
--   * out_for_delivery só existe para entregas;
--   * canceled a partir de qualquer status não final;
--   * completed e canceled são finais.
-- ---------------------------------------------------------------------
create or replace function private.status_rank(p_status public.order_status)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'new' then 1
    when 'confirmed' then 2
    when 'preparing' then 3
    when 'ready' then 4
    when 'out_for_delivery' then 5
    when 'completed' then 6
    when 'canceled' then 7
  end;
$$;

create or replace function private.can_transition(
  p_from public.order_status,
  p_to public.order_status,
  p_fulfillment public.fulfillment_type
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_from in ('completed', 'canceled') then false
    when p_to = p_from then false
    when p_to = 'canceled' then true
    when p_to = 'out_for_delivery' and p_fulfillment <> 'delivery' then false
    else private.status_rank(p_to) > private.status_rank(p_from)
  end;
$$;

create or replace function public.update_order_status(p_order_id uuid, p_status public.order_status)
returns public.orders
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_previous public.order_status;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if not found or not private.is_store_member(v_order.store_id) then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not private.can_transition(v_order.status, p_status, v_order.fulfillment) then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001',
      detail = v_order.status::text || ' -> ' || p_status::text;
  end if;

  v_previous := v_order.status;

  update public.orders
  set status = p_status, status_updated_at = now()
  where id = p_order_id
  returning * into v_order;

  insert into public.order_status_history (order_id, store_id, from_status, to_status, changed_by)
  values (v_order.id, v_order.store_id, v_previous, p_status, (select auth.uid()));

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------
-- Anonimização de cliente (solicitação do titular dos dados)
-- Mantém os pedidos para a contabilidade da loja, mas remove nome,
-- telefone e endereço.
-- ---------------------------------------------------------------------
create or replace function public.anonymize_customer(p_customer_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
begin
  select store_id into v_store_id from public.customers where id = p_customer_id;
  if not found or not private.is_store_owner(v_store_id) then
    raise exception 'CUSTOMER_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.orders
  set customer_name = 'Cliente removido',
      customer_phone = null,
      delivery_address = null,
      notes = null,
      customer_id = null
  where customer_id = p_customer_id and store_id = v_store_id;

  delete from public.customers where id = p_customer_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Assinaturas: aplicado SOMENTE por backend confiável (service_role),
-- a partir de um webhook assinado do gateway de pagamentos.
-- Idempotente por (provider, provider_event_id).
-- ---------------------------------------------------------------------
create or replace function public.apply_subscription_event(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_store_id uuid,
  p_status public.subscription_status,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_provider_customer_id text,
  p_provider_subscription_id text,
  p_cancel_at_period_end boolean,
  p_payload jsonb
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_inserted uuid;
begin
  insert into public.billing_events (provider, provider_event_id, event_type, store_id, payload)
  values (p_provider, p_provider_event_id, p_event_type, p_store_id, coalesce(p_payload, '{}'::jsonb))
  on conflict (provider, provider_event_id) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return false; -- evento já processado
  end if;

  update public.subscriptions
  set status = p_status,
      provider = p_provider,
      provider_customer_id = coalesce(p_provider_customer_id, provider_customer_id),
      provider_subscription_id = coalesce(p_provider_subscription_id, provider_subscription_id),
      current_period_start = coalesce(p_current_period_start, current_period_start),
      current_period_end = coalesce(p_current_period_end, current_period_end),
      cancel_at_period_end = coalesce(p_cancel_at_period_end, cancel_at_period_end),
      canceled_at = case when p_status = 'canceled' then coalesce(canceled_at, now()) else canceled_at end
  where store_id = p_store_id;

  if not found then
    raise exception 'SUBSCRIPTION_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.billing_events set processed_at = now() where id = v_inserted;
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- Privilégios de execução
-- ---------------------------------------------------------------------
revoke all on function public.get_store_access(uuid) from public, anon;
revoke all on function public.is_slug_available(text) from public, anon;
revoke all on function public.create_store(text, text) from public, anon;
revoke all on function public.get_public_menu(text) from public;
revoke all on function public.create_public_order(text, uuid, jsonb) from public;
revoke all on function public.update_order_status(uuid, public.order_status) from public, anon;
revoke all on function public.anonymize_customer(uuid) from public, anon;
revoke all on function public.apply_subscription_event(
  text, text, text, uuid, public.subscription_status, timestamptz, timestamptz, text, text, boolean, jsonb
) from public, anon, authenticated;

grant execute on function public.get_store_access(uuid) to authenticated;
grant execute on function public.is_slug_available(text) to authenticated;
grant execute on function public.create_store(text, text) to authenticated;
grant execute on function public.get_public_menu(text) to anon, authenticated;
grant execute on function public.create_public_order(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.anonymize_customer(uuid) to authenticated;
grant execute on function public.apply_subscription_event(
  text, text, text, uuid, public.subscription_status, timestamptz, timestamptz, text, text, boolean, jsonb
) to service_role;

-- Funções privadas usadas dentro das funções acima (executam como definer).
revoke all on all functions in schema private from public;
grant execute on function private.my_store_ids() to authenticated;
grant execute on function private.is_store_member(uuid) to authenticated;
grant execute on function private.is_store_owner(uuid) to authenticated;
-- Funções puras usadas em CHECK constraints.
grant execute on function private.valid_opening_hours(jsonb) to authenticated, service_role;
grant execute on function private.is_valid_slug(text) to authenticated, service_role;
grant execute on function private.set_updated_at() to authenticated, service_role;
