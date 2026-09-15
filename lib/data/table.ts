import { createClient } from '@/lib/supabase/client'

export type TableInfo = {
  tableId: string
  tableLabel: string
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
}

export async function getTableByQrToken(qrToken: string): Promise<TableInfo | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_get_table', { p_qr_token: qrToken })
    .maybeSingle()

  if (error || !data) return null

  return {
    tableId: data.table_id,
    tableLabel: data.table_label,
    restaurantId: data.restaurant_id,
    restaurantName: data.restaurant_name,
    restaurantSlug: data.restaurant_slug,
  }
}
