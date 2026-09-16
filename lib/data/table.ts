import { createClient } from '@/lib/supabase/client'

export type TableInfo = {
  tableId: string
  tableLabel: string
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
  availability: 'available' | 'reserved' | 'unavailable'
}

export async function getTableByQrToken(qrToken: string): Promise<TableInfo | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_get_table', { p_qr_token: qrToken })
    .maybeSingle()

  if (error || !data) return null

  const row = data as {
    table_id: string
    table_label: string
    restaurant_id: string
    restaurant_name: string
    restaurant_slug: string
    availability: TableInfo['availability']
  }

  return {
    tableId: row.table_id,
    tableLabel: row.table_label,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name,
    restaurantSlug: row.restaurant_slug,
    availability: row.availability,
  }
}
