import { createClient } from '@/lib/supabase/client'

export type SubmittedOrderItem = {
  id: string
  dishId: string
  dishName: string
  quantity: number
  notes: string
  unitPrice: number
}

export type LatestOrder = {
  id: string
  submittedAt: string
  status: 'pending' | 'preparing' | 'ready' | 'delivered'
  kitchenNotes: string
  items: SubmittedOrderItem[]
  total: number
}

export async function getLatestOrder(deviceToken: string): Promise<LatestOrder | null> {
  const { data, error } = await createClient().rpc('rpc_get_latest_order', {
    p_device_token: deviceToken,
  })
  if (error) throw new Error(error.message)
  if (!data?.length) return null

  const rows = data as Array<{
    round_id: string
    submitted_at: string
    round_status: LatestOrder['status']
    kitchen_notes: string
    cart_item_id: string
    dish_id: string
    dish_name: string
    quantity: number
    item_notes: string
    unit_price_snapshot: number | string
  }>
  const items = rows.map((row) => ({
    id: row.cart_item_id,
    dishId: row.dish_id,
    dishName: row.dish_name,
    quantity: row.quantity,
    notes: row.item_notes,
    unitPrice: Number(row.unit_price_snapshot),
  }))

  return {
    id: rows[0].round_id,
    submittedAt: rows[0].submitted_at,
    status: rows[0].round_status,
    kitchenNotes: rows[0].kitchen_notes,
    items,
    total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  }
}
