import { getSupabase } from '@/lib/supabase'
import { onlyDigits } from '@/lib/phone'
import type { CustomerRow } from '@/types/database'

export async function fetchCustomers(storeId: string, search: string): Promise<CustomerRow[]> {
  let query = getSupabase()
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .order('last_order_at', { ascending: false, nullsFirst: false })
    .limit(200)
  const term = search.trim()
  if (term) {
    const digits = onlyDigits(term)
    const safe = term.replace(/[%_,()*]/g, ' ')
    query = digits.length >= 3 ? query.ilike('phone', `%${digits}%`) : query.ilike('name', `%${safe}%`)
  }
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function anonymizeCustomer(customerId: string): Promise<void> {
  const { error } = await getSupabase().rpc('anonymize_customer', { p_customer_id: customerId })
  if (error) throw error
}
