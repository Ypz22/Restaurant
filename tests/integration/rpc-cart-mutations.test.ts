import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { addCartItem, updateCartItemQuantity, removeCartItem, getCart } from '@/lib/data/cart'
import { startSession } from '@/lib/data/session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let deviceTokenA: string
let deviceTokenB: string
let tableSessionId: string
let dishId: string

beforeAll(async () => {
  const { data: restaurant } = await admin
    .from('restaurants').insert({ name: 'T', slug: 'mut-' + Date.now() }).select().single()
  const { data: table } = await admin
    .from('tables').insert({ restaurant_id: restaurant!.id, label: 'T1' }).select().single()
  const { data: category } = await admin
    .from('menu_categories').insert({ restaurant_id: restaurant!.id, name: 'Cat' }).select().single()
  const { data: dish } = await admin
    .from('dishes').insert({
      restaurant_id: restaurant!.id, category_id: category!.id, name: 'Plato', price: 10,
    }).select().single()
  dishId = dish!.id

  const sessionA = await startSession(table!.qr_token, 'Ana')
  deviceTokenA = sessionA.deviceToken
  tableSessionId = sessionA.tableSessionId
  const sessionB = await startSession(table!.qr_token, 'Beto')
  deviceTokenB = sessionB.deviceToken
})

describe('cart mutations', () => {
  it('lets a different diner at the same table update the quantity', async () => {
    const item = await addCartItem(deviceTokenA, dishId, 1)
    const updated = await updateCartItemQuantity(deviceTokenB, item.id, 3)
    expect(updated.quantity).toBe(3)
  })

  it('lets a different diner remove the item, and it disappears from getCart', async () => {
    const item = await addCartItem(deviceTokenA, dishId, 1)
    await removeCartItem(deviceTokenB, item.id)
    const cart = await getCart(tableSessionId)
    expect(cart.find((c) => c.id === item.id)).toBeUndefined()
  })
})
