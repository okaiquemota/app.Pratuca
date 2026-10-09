import { getSupabase } from '@/lib/supabase'
import type { CategoryRow, DailyMenuItemRow, DailyMenuRow, OptionGroupRow, OptionRow, ProductRow } from '@/types/database'

// ---------------------------------------------------------------- categorias
export async function fetchCategories(storeId: string): Promise<CategoryRow[]> {
  const { data, error } = await getSupabase()
    .from('categories')
    .select('*')
    .eq('store_id', storeId)
    .order('position')
    .order('name')
  if (error) throw error
  return data
}

export async function saveCategory(storeId: string, values: { id?: string; name: string; is_active?: boolean; position?: number }) {
  const supabase = getSupabase()
  if (values.id) {
    const { error } = await supabase
      .from('categories')
      .update({ name: values.name, is_active: values.is_active, position: values.position })
      .eq('id', values.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('categories')
      .insert({ store_id: storeId, name: values.name, is_active: values.is_active ?? true, position: values.position ?? 0 })
    if (error) throw error
  }
}

export async function deleteCategory(id: string) {
  const { error } = await getSupabase().from('categories').delete().eq('id', id)
  if (error) throw error
}

/** Atualiza a ordem de exibição (position = índice). */
export async function reorder(table: 'categories' | 'products', ids: string[]) {
  const supabase = getSupabase()
  const results = await Promise.all(ids.map((id, position) => supabase.from(table).update({ position }).eq('id', id)))
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}

// ---------------------------------------------------------------- produtos
export async function fetchProducts(storeId: string): Promise<ProductRow[]> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('position')
    .order('name')
  if (error) throw error
  return data
}

export type ProductInput = Pick<ProductRow, 'name' | 'description' | 'price_cents' | 'category_id' | 'is_available' | 'is_active' | 'image_path'>

export async function saveProduct(storeId: string, input: ProductInput & { id?: string; position?: number }): Promise<ProductRow> {
  const supabase = getSupabase()
  const { id, ...values } = input
  const query = id
    ? supabase.from('products').update(values).eq('id', id).select('*').single()
    : supabase.from('products').insert({ ...values, store_id: storeId }).select('*').single()
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function setProductFlags(id: string, flags: Partial<Pick<ProductRow, 'is_available' | 'is_active'>>) {
  const { error } = await getSupabase().from('products').update(flags).eq('id', id)
  if (error) throw error
}

export async function deleteProduct(id: string) {
  const { error } = await getSupabase().from('products').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------- adicionais
export interface OptionGroupWithOptions extends OptionGroupRow {
  product_options: OptionRow[]
}

export async function fetchOptionGroups(productId: string): Promise<OptionGroupWithOptions[]> {
  const { data, error } = await getSupabase()
    .from('product_option_groups')
    .select('*, product_options(*)')
    .eq('product_id', productId)
    .order('position')
  if (error) throw error
  const groups = data as unknown as OptionGroupWithOptions[]
  return groups.map((g) => ({ ...g, product_options: [...g.product_options].sort((a, b) => a.position - b.position) }))
}

export interface OptionGroupDraft {
  id?: string
  name: string
  min_select: number
  max_select: number
  options: Array<{ id?: string; name: string; price_cents: number; is_available: boolean }>
}

/**
 * Sincroniza os grupos/opções de um produto com o rascunho do formulário:
 * cria, atualiza e remove o que mudou.
 */
export async function syncOptionGroups(storeId: string, productId: string, drafts: OptionGroupDraft[]) {
  const supabase = getSupabase()
  const current = await fetchOptionGroups(productId)
  const keptGroupIds = new Set(drafts.map((d) => d.id).filter(Boolean))

  const removedGroups = current.filter((g) => !keptGroupIds.has(g.id)).map((g) => g.id)
  if (removedGroups.length) {
    const { error } = await supabase.from('product_option_groups').delete().in('id', removedGroups)
    if (error) throw error
  }

  for (const [position, draft] of drafts.entries()) {
    const groupValues = { name: draft.name, min_select: draft.min_select, max_select: draft.max_select, position }
    let groupId = draft.id
    if (groupId) {
      const { error } = await supabase.from('product_option_groups').update(groupValues).eq('id', groupId)
      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('product_option_groups')
        .insert({ ...groupValues, store_id: storeId, product_id: productId })
        .select('id')
        .single()
      if (error) throw error
      groupId = data.id
    }

    const existing = current.find((g) => g.id === groupId)?.product_options ?? []
    const keptOptionIds = new Set(draft.options.map((o) => o.id).filter(Boolean))
    const removedOptions = existing.filter((o) => !keptOptionIds.has(o.id)).map((o) => o.id)
    if (removedOptions.length) {
      const { error } = await supabase.from('product_options').delete().in('id', removedOptions)
      if (error) throw error
    }
    for (const [optionPosition, option] of draft.options.entries()) {
      const values = { name: option.name, price_cents: option.price_cents, is_available: option.is_available, position: optionPosition }
      const { error } = option.id
        ? await supabase.from('product_options').update(values).eq('id', option.id)
        : await supabase.from('product_options').insert({ ...values, store_id: storeId, group_id: groupId })
      if (error) throw error
    }
  }
}

// ---------------------------------------------------------------- cardápio do dia
export interface DailyMenuWithItems extends DailyMenuRow {
  daily_menu_items: DailyMenuItemRow[]
}

export async function fetchDailyMenu(storeId: string, date: string): Promise<DailyMenuWithItems | null> {
  const { data, error } = await getSupabase()
    .from('daily_menus')
    .select('*, daily_menu_items(*)')
    .eq('store_id', storeId)
    .eq('menu_date', date)
    .maybeSingle()
  if (error) throw error
  return data as unknown as DailyMenuWithItems | null
}

/** Data do cardápio do dia mais recente anterior a `date` (para copiar). */
export async function fetchPreviousDailyMenu(storeId: string, date: string): Promise<DailyMenuWithItems | null> {
  const { data, error } = await getSupabase()
    .from('daily_menus')
    .select('*, daily_menu_items(*)')
    .eq('store_id', storeId)
    .lt('menu_date', date)
    .order('menu_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as unknown as DailyMenuWithItems | null
}

export interface DailyMenuDraft {
  title: string
  note: string
  is_published: boolean
  items: Array<{ product_id: string; price_cents: number | null; is_available: boolean }>
}

export async function saveDailyMenu(storeId: string, date: string, draft: DailyMenuDraft): Promise<void> {
  const supabase = getSupabase()
  const { data: menu, error } = await supabase
    .from('daily_menus')
    .upsert(
      { store_id: storeId, menu_date: date, title: draft.title || null, note: draft.note || null, is_published: draft.is_published },
      { onConflict: 'store_id,menu_date' },
    )
    .select('id')
    .single()
  if (error) throw error

  const { error: deleteError } = await supabase.from('daily_menu_items').delete().eq('daily_menu_id', menu.id)
  if (deleteError) throw deleteError
  if (draft.items.length) {
    const { error: insertError } = await supabase.from('daily_menu_items').insert(
      draft.items.map((item, position) => ({ ...item, position, store_id: storeId, daily_menu_id: menu.id })),
    )
    if (insertError) throw insertError
  }
}

export async function deleteDailyMenu(storeId: string, date: string) {
  const { error } = await getSupabase().from('daily_menus').delete().eq('store_id', storeId).eq('menu_date', date)
  if (error) throw error
}
