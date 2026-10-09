import { extensionFor, prepareImage } from '@/lib/images'
import { getSupabase } from '@/lib/supabase'
import type { PlanRow, StoreRow, StoreUpdate, SubscriptionRow } from '@/types/database'

/** Loja do usuário atual (RLS só devolve lojas das quais ele é membro). */
export async function fetchMyStore(): Promise<StoreRow | null> {
  const { data, error } = await getSupabase()
    .from('stores')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createStore(name: string, slug: string): Promise<StoreRow> {
  const { data, error } = await getSupabase().rpc('create_store', { p_name: name, p_slug: slug })
  if (error) throw error
  return data
}

export async function updateStore(storeId: string, values: StoreUpdate): Promise<StoreRow> {
  const { data, error } = await getSupabase().from('stores').update(values).eq('id', storeId).select('*').single()
  if (error) throw error
  return data
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('is_slug_available', { p_slug: slug })
  if (error) throw error
  return data
}

export async function fetchSubscription(storeId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await getSupabase().from('subscriptions').select('*').eq('store_id', storeId).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchStoreAccess(storeId: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('get_store_access', { p_store_id: storeId })
  if (error) throw error
  return data
}

export async function fetchActivePlan(): Promise<PlanRow | null> {
  const { data, error } = await getSupabase().from('plans').select('*').eq('is_active', true).order('price_cents').limit(1).maybeSingle()
  if (error) throw error
  return data
}

/** Envia imagem para store-media/<store_id>/<pasta>/<uuid>.<ext> */
export async function uploadStoreImage(storeId: string, folder: 'logo' | 'produtos', file: File): Promise<string> {
  const blob = await prepareImage(file)
  const path = `${storeId}/${folder}/${crypto.randomUUID()}.${extensionFor(blob.type)}`
  const { error } = await getSupabase().storage.from('store-media').upload(path, blob, {
    contentType: blob.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function removeStoreImage(path: string): Promise<void> {
  await getSupabase().storage.from('store-media').remove([path])
}
