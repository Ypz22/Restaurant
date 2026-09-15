import { createClient } from '@/lib/supabase/client'

export type CartItem = {
  id: string
  tableSessionId: string
  dishId: string
  dinerId: string
  quantity: number
  notes: string
  unitPriceSnapshot: number
  status: 'in_cart' | 'submitted'
  orderRoundId: string | null
}

function mapRow(row: any): CartItem {
  return {
    id: row.id,
    tableSessionId: row.table_session_id,
    dishId: row.dish_id,
    dinerId: row.diner_id,
    quantity: row.quantity,
    notes: row.notes,
    unitPriceSnapshot: Number(row.unit_price_snapshot),
    status: row.status,
    orderRoundId: row.order_round_id,
  }
}

export async function addCartItem(
  deviceToken: string,
  dishId: string,
  quantity: number,
  notes = ''
): Promise<CartItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_add_cart_item', {
      p_device_token: deviceToken,
      p_dish_id: dishId,
      p_quantity: quantity,
      p_notes: notes,
    })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'add_cart_item_failed')
  return mapRow(data)
}

export type CartItemWithDetails = CartItem & { dishName: string; dinerNickname: string }

export async function getCart(deviceToken: string): Promise<CartItemWithDetails[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rpc_get_cart', { p_device_token: deviceToken })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: any) => ({
    ...mapRow(row),
    dishName: row.dish_name,
    dinerNickname: row.diner_nickname,
  }))
}

export async function updateCartItemQuantity(
  deviceToken: string,
  cartItemId: string,
  quantity: number
): Promise<CartItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_update_cart_item_quantity', {
      p_device_token: deviceToken,
      p_cart_item_id: cartItemId,
      p_quantity: quantity,
    })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'update_cart_item_failed')
  return mapRow(data)
}

export async function removeCartItem(deviceToken: string, cartItemId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rpc_remove_cart_item', {
    p_device_token: deviceToken,
    p_cart_item_id: cartItemId,
  })
  if (error) throw new Error(error.message)
}
