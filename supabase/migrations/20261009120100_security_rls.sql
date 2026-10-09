-- =====================================================================
-- Pratuca — privilégios e Row Level Security
-- Princípio do menor privilégio:
--   1. Revogamos tudo de anon/authenticated (inclusive privilégios
--      padrão que projetos Supabase antigos concedem automaticamente).
--   2. Concedemos apenas o necessário, por tabela e por coluna.
--   3. RLS restringe as linhas à(s) loja(s) do usuário.
--   4. anon NÃO acessa tabelas: o cardápio público e a criação de
--      pedidos passam por funções SECURITY DEFINER controladas.
-- =====================================================================

-- Novos objetos em public não devem ficar expostos automaticamente.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------
-- Helpers de autorização (schema private, não exposto pela API)
-- ---------------------------------------------------------------------
grant usage on schema private to authenticated, service_role;

-- IDs das lojas das quais o usuário atual é membro.
create or replace function private.my_store_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.store_id
  from public.store_members m
  where m.user_id = (select auth.uid());
$$;

create or replace function private.is_store_member(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.store_members m
    where m.store_id = p_store_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_store_owner(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.store_members m
    where m.store_id = p_store_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

revoke all on function private.my_store_ids() from public;
revoke all on function private.is_store_member(uuid) from public;
revoke all on function private.is_store_owner(uuid) from public;
grant execute on function private.my_store_ids() to authenticated;
grant execute on function private.is_store_member(uuid) to authenticated;
grant execute on function private.is_store_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Habilita RLS em todas as tabelas
-- ---------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_option_groups enable row level security;
alter table public.product_options enable row level security;
alter table public.daily_menus enable row level security;
alter table public.daily_menu_items enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

-- ---------------------------------------------------------------------
-- plans: leitura pública dos planos ativos (página de preços)
-- ---------------------------------------------------------------------
grant select on public.plans to anon, authenticated;
create policy plans_read_active on public.plans
  for select to anon, authenticated
  using (is_active);

-- ---------------------------------------------------------------------
-- profiles: cada usuário vê e edita apenas o próprio perfil
-- ---------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- stores
--   * membros leem; somente o proprietário altera configurações.
--   * owner_id, last_order_number e timestamps não são graváveis pelo cliente.
--   * exclusão de loja é um procedimento administrativo (ver docs/SECURITY.md).
-- ---------------------------------------------------------------------
grant select on public.stores to authenticated;
grant insert (name, slug) on public.stores to authenticated;
grant update (
  name, slug, description, welcome_message, logo_path, phone, whatsapp, address,
  timezone, opening_hours, accepts_delivery, accepts_pickup, delivery_fee_cents,
  min_order_cents, payment_methods, is_open, is_published, onboarding_step,
  onboarding_completed_at
) on public.stores to authenticated;

create policy stores_select_member on public.stores
  for select to authenticated
  using (id in (select private.my_store_ids()));

create policy stores_insert_self on public.stores
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy stores_update_owner on public.stores
  for update to authenticated
  using ((select private.is_store_owner(id)))
  with check ((select private.is_store_owner(id)));

-- ---------------------------------------------------------------------
-- store_members: leitura para membros da mesma loja.
-- Convites/novos membros serão feitos por função confiável (futuro).
-- ---------------------------------------------------------------------
grant select on public.store_members to authenticated;

create policy store_members_select on public.store_members
  for select to authenticated
  using (user_id = (select auth.uid()) or store_id in (select private.my_store_ids()));

-- ---------------------------------------------------------------------
-- subscriptions: somente leitura pelos membros.
-- Alterações apenas via service_role (webhooks do gateway).
-- ---------------------------------------------------------------------
grant select on public.subscriptions to authenticated;

create policy subscriptions_select_member on public.subscriptions
  for select to authenticated
  using (store_id in (select private.my_store_ids()));

-- billing_events: nenhum acesso para anon/authenticated (apenas service_role).

-- ---------------------------------------------------------------------
-- Catálogo: CRUD completo para membros da loja
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_option_groups to authenticated;
grant select, insert, update, delete on public.product_options to authenticated;
grant select, insert, update, delete on public.daily_menus to authenticated;
grant select, insert, update, delete on public.daily_menu_items to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'products', 'product_option_groups', 'product_options',
    'daily_menus', 'daily_menu_items'
  ]
  loop
    execute format(
      'create policy %1$s_member_all on public.%1$I
         for all to authenticated
         using (store_id in (select private.my_store_ids()))
         with check (store_id in (select private.my_store_ids()))',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Clientes e pedidos: somente leitura direta pelos membros.
-- Criação de pedidos: public.create_public_order (SECURITY DEFINER).
-- Mudança de status: public.update_order_status (SECURITY DEFINER).
-- ---------------------------------------------------------------------
grant select on public.customers to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.order_status_history to authenticated;

create policy customers_select_member on public.customers
  for select to authenticated
  using (store_id in (select private.my_store_ids()));

create policy orders_select_member on public.orders
  for select to authenticated
  using (store_id in (select private.my_store_ids()));

create policy order_items_select_member on public.order_items
  for select to authenticated
  using (store_id in (select private.my_store_ids()));

create policy order_status_history_select_member on public.order_status_history
  for select to authenticated
  using (store_id in (select private.my_store_ids()));
