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

export type OrderHistoryRound = LatestOrder

type HistoryRow = {
  round_id: string
  submitted_at: string
  round_status: LatestOrder['status']
  kitchen_notes: string
  items: Array<{
    id: string
    dish_id: string
    dish_name: string
    quantity: number
    notes: string
    unit_price: number | string
  }>
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

export async function getOrderHistory(deviceToken: string): Promise<OrderHistoryRound[]> {
  const { data, error } = await createClient().rpc('rpc_get_order_history', {
    p_device_token: deviceToken,
  })
  if (error) throw new Error(error.message)

  return ((data ?? []) as HistoryRow[]).map((row) => {
    const items = row.items.map((item) => ({
      id: item.id,
      dishId: item.dish_id,
      dishName: item.dish_name,
      quantity: item.quantity,
      notes: item.notes,
      unitPrice: Number(item.unit_price),
    }))

    return {
      id: row.round_id,
      submittedAt: row.submitted_at,
      status: row.round_status,
      kitchenNotes: row.kitchen_notes,
      items,
      total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    }
  })
}
