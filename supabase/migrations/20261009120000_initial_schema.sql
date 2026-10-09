-- =====================================================================
-- Pratuca — schema inicial
-- Convenções:
--   * UUID em todos os identificadores internos.
--   * Valores monetários em CENTAVOS (integer), moeda BRL.
--   * timestamptz em todas as datas.
--   * Toda tabela privada tem store_id para isolamento por loja (RLS).
--   * Chaves estrangeiras compostas (id, store_id) impedem que registros
--     de uma loja referenciem registros de outra.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- Schema para funções internas: NÃO é exposto pela Data API.
create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.order_status as enum (
  'new',              -- Novo
  'confirmed',        -- Confirmado
  'preparing',        -- Em preparo
  'ready',            -- Pronto
  'out_for_delivery', -- Saiu para entrega
  'completed',        -- Concluído
  'canceled'          -- Cancelado
);

create type public.fulfillment_type as enum ('delivery', 'pickup');

create type public.payment_method as enum ('pix', 'cash', 'credit_card', 'debit_card', 'meal_voucher');

create type public.subscription_status as enum (
  'trialing', -- período de teste
  'active',   -- ativa e paga
  'past_due', -- pagamento atrasado (com carência)
  'canceled', -- cancelada
  'pending'   -- aguardando primeiro pagamento / configuração
);

create type public.member_role as enum ('owner', 'staff');

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Valida o formato de horários de funcionamento:
-- [{"day":0..6,"open":"HH:MM","close":"HH:MM"}, ...]  (0 = domingo)
create or replace function private.valid_opening_hours(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'array'
     and jsonb_array_length(p) <= 21
     and not exists (
       select 1
       from jsonb_array_elements(p) as e(item)
       where jsonb_typeof(e.item) <> 'object'
          or jsonb_typeof(e.item -> 'day') <> 'number'
          or (e.item ->> 'day') !~ '^[0-6]$'
          or coalesce(e.item ->> 'open', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          or coalesce(e.item ->> 'close', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     );
$$;

-- ---------------------------------------------------------------------
-- Planos (preparado para planos futuros; v1 tem apenas "essencial")
-- ---------------------------------------------------------------------
create table public.plans (
  code text primary key check (code ~ '^[a-z0-9_]{2,32}$'),
  name text not null check (char_length(name) between 2 and 60),
  price_cents integer not null check (price_cents >= 0),
  currency char(3) not null default 'BRL',
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  trial_days integer not null default 7 check (trial_days between 0 and 90),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.plans (code, name, price_cents, currency, billing_interval, trial_days)
values ('essencial', 'Essencial', 3990, 'BRL', 'month', 7);

-- ---------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 120))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------
-- Lojas
-- ---------------------------------------------------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  slug text not null,
  description text check (char_length(description) <= 500),
  welcome_message text check (char_length(welcome_message) <= 280),
  logo_path text check (char_length(logo_path) <= 300),
  phone text check (phone ~ '^[0-9]{10,13}$'),
  -- WhatsApp em dígitos com DDI (ex.: 5511987654321)
  whatsapp text check (whatsapp ~ '^[0-9]{12,13}$'),
  address text check (char_length(address) <= 200),
  timezone text not null default 'America/Sao_Paulo' check (char_length(timezone) <= 64),
  opening_hours jsonb not null default '[]'::jsonb check (private.valid_opening_hours(opening_hours)),
  accepts_delivery boolean not null default true,
  accepts_pickup boolean not null default true,
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents between 0 and 100000),
  min_order_cents integer check (min_order_cents between 0 and 1000000),
  payment_methods public.payment_method[] not null default '{pix,cash}'
    check (cardinality(payment_methods) between 1 and 5),
  is_open boolean not null default false,
  is_published boolean not null default false,
  onboarding_step smallint not null default 2 check (onboarding_step between 1 and 5),
  onboarding_completed_at timestamptz,
  last_order_number integer not null default 0 check (last_order_number >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_slug_format check (
    slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$' and slug !~ '--'
  ),
  constraint stores_slug_not_reserved check (
    slug <> all (array[
      'admin', 'api', 'app', 'ajuda', 'assinatura', 'auth', 'cardapio', 'conta', 'criar-conta',
      'entrar', 'login', 'loja', 'lojas', 'movcode', 'pedido', 'pedidos', 'pratuca', 'precos',
      'privacidade', 'suporte', 'termos', 'www'
    ])
  ),
  constraint stores_fulfillment_check check (accepts_delivery or accepts_pickup),
  constraint stores_publish_requires_whatsapp check (not is_published or whatsapp is not null)
);

create unique index stores_slug_key on public.stores (slug);
-- MVP: um proprietário possui uma loja. Remover este índice para permitir várias lojas.
create unique index stores_owner_id_key on public.stores (owner_id);

create trigger stores_set_updated_at
before update on public.stores
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Membros da loja (proprietário + usuários adicionais no futuro)
-- ---------------------------------------------------------------------
create table public.store_members (
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create index store_members_user_id_idx on public.store_members (user_id);

-- ---------------------------------------------------------------------
-- Assinaturas
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores (id) on delete cascade,
  plan_code text not null references public.plans (code),
  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  provider text check (char_length(provider) <= 40),
  provider_customer_id text check (char_length(provider_customer_id) <= 200),
  provider_subscription_id text check (char_length(provider_subscription_id) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_provider_subscription_key
  on public.subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function private.set_updated_at();

-- Eventos de cobrança recebidos por webhook (idempotência e auditoria).
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  store_id uuid references public.stores (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

-- Ao criar a loja: registra o proprietário como membro e inicia o teste.
create or replace function private.handle_new_store()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trial_days integer;
begin
  insert into public.store_members (store_id, user_id, role)
  values (new.id, new.owner_id, 'owner');

  select trial_days into v_trial_days from public.plans where code = 'essencial';

  insert into public.subscriptions (store_id, plan_code, status, trial_ends_at)
  values (
    new.id,
    'essencial',
    case when coalesce(v_trial_days, 0) > 0 then 'trialing'::public.subscription_status
         else 'pending'::public.subscription_status end,
    case when coalesce(v_trial_days, 0) > 0 then now() + make_interval(days => v_trial_days) end
  );
  return new;
end;
$$;

create trigger on_store_created
after insert on public.stores
for each row execute function private.handle_new_store();

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, store_id)
);

create index categories_store_id_idx on public.categories (store_id, position);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category_id uuid,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text check (char_length(description) <= 300),
  price_cents integer not null check (price_cents between 0 and 100000),
  image_path text check (char_length(image_path) <= 300),
  -- is_active = false → produto desativado (não aparece no cardápio)
  is_active boolean not null default true,
  -- is_available = false → temporariamente indisponível (aparece como esgotado)
  is_available boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, store_id),
  foreign key (category_id, store_id)
    references public.categories (id, store_id) on delete set null (category_id)
);

create index products_store_id_idx on public.products (store_id, position);
create index products_category_id_idx on public.products (category_id);

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

-- Grupos de opções/adicionais (ex.: "Escolha a carne", "Adicionais")
create table public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  min_select smallint not null default 0 check (min_select between 0 and 10),
  max_select smallint not null default 1 check (max_select between 1 and 20),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, store_id),
  check (min_select <= max_select),
  foreign key (product_id, store_id) references public.products (id, store_id) on delete cascade
);

create index product_option_groups_product_idx on public.product_option_groups (product_id, position);

create trigger product_option_groups_set_updated_at
before update on public.product_option_groups
for each row execute function private.set_updated_at();

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  group_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  price_cents integer not null default 0 check (price_cents between 0 and 100000),
  is_available boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (group_id, store_id) references public.product_option_groups (id, store_id) on delete cascade
);

create index product_options_group_idx on public.product_options (group_id, position);

create trigger product_options_set_updated_at
before update on public.product_options
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Cardápio do dia: seleção de produtos existentes para uma data,
-- com preço opcional sobrescrito. Se houver cardápio do dia publicado
-- para a data atual (fuso da loja), o cardápio público mostra apenas
-- esses itens; caso contrário mostra o catálogo completo ativo.
-- ---------------------------------------------------------------------
create table public.daily_menus (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  menu_date date not null,
  title text check (char_length(title) <= 80),
  note text check (char_length(note) <= 280),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, menu_date),
  unique (id, store_id)
);

create trigger daily_menus_set_updated_at
before update on public.daily_menus
for each row execute function private.set_updated_at();

create table public.daily_menu_items (
  daily_menu_id uuid not null,
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null,
  price_cents integer check (price_cents between 0 and 100000),
  is_available boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (daily_menu_id, product_id),
  foreign key (daily_menu_id, store_id) references public.daily_menus (id, store_id) on delete cascade,
  foreign key (product_id, store_id) references public.products (id, store_id) on delete cascade
);

create index daily_menu_items_product_idx on public.daily_menu_items (product_id);

-- ---------------------------------------------------------------------
-- Clientes (registrados automaticamente a partir dos pedidos)
-- ---------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (phone ~ '^[0-9]{10,13}$'),
  orders_count integer not null default 0,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, phone),
  unique (id, store_id)
);

create trigger customers_set_updated_at
before update on public.customers
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  number integer not null check (number > 0),
  customer_id uuid,
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  -- nulo apenas após anonimização a pedido do titular
  customer_phone text check (customer_phone ~ '^[0-9]{10,13}$'),
  fulfillment public.fulfillment_type not null,
  -- {"street","number","complement","neighborhood","reference"}
  delivery_address jsonb,
  payment_method public.payment_method not null,
  change_for_cents integer check (change_for_cents between 0 and 1000000),
  notes text check (char_length(notes) <= 500),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  status public.order_status not null default 'new',
  status_updated_at timestamptz not null default now(),
  idempotency_key uuid not null,
  daily_menu_id uuid references public.daily_menus (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, number),
  unique (store_id, idempotency_key),
  unique (id, store_id),
  constraint orders_total_check check (total_cents = subtotal_cents + delivery_fee_cents),
  constraint orders_delivery_address_check check (
    fulfillment <> 'delivery' or delivery_address is not null or customer_phone is null
  ),
  foreign key (customer_id, store_id)
    references public.customers (id, store_id) on delete set null (customer_id)
);

create index orders_store_created_idx on public.orders (store_id, created_at desc);
create index orders_store_status_idx on public.orders (store_id, status);
create index orders_customer_idx on public.orders (customer_id);
create index orders_rate_limit_idx on public.orders (store_id, customer_phone, created_at desc);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function private.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  -- Snapshots: preservam o histórico mesmo que o cardápio mude depois
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  options jsonb not null default '[]'::jsonb,
  options_unit_cents integer not null default 0 check (options_unit_cents >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total_cents integer not null check (line_total_cents >= 0),
  notes text check (char_length(notes) <= 200),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint order_items_line_total_check
    check (line_total_cents = (unit_price_cents + options_unit_cents) * quantity),
  foreign key (order_id, store_id) references public.orders (id, store_id) on delete cascade
);

create index order_items_order_idx on public.order_items (order_id, position);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null,
  store_id uuid not null references public.stores (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (order_id, store_id) references public.orders (id, store_id) on delete cascade
);

create index order_status_history_order_idx on public.order_status_history (order_id, created_at);
