import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { addCartItem } from '@/lib/data/cart'
import { startSession } from '@/lib/data/session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let deviceToken: string
let availableDishId: string
let unavailableDishId: string

beforeAll(async () => {
  const { data: restaurant } = await admin
    .from('restaurants').insert({ name: 'Test', slug: 'test-' + Date.now() }).select().single()
  const { data: table } = await admin
    .from('tables').insert({ restaurant_id: restaurant!.id, label: 'T1' }).select().single()
  const { data: category } = await admin
    .from('menu_categories').insert({ restaurant_id: restaurant!.id, name: 'Cat' }).select().single()
  const { data: dish } = await admin
    .from('dishes').insert({
      restaurant_id: restaurant!.id, category_id: category!.id,
      name: 'Plato', price: 10, is_available: true,
    }).select().single()
  const { data: outOfStock } = await admin
    .from('dishes').insert({
      restaurant_id: restaurant!.id, category_id: category!.id,
      name: 'Agotado', price: 5, is_available: false,
    }).select().single()

  availableDishId = dish!.id
  unavailableDishId = outOfStock!.id

  const session = await startSession(table!.qr_token, 'Ana')
  deviceToken = session.deviceToken
})

describe('addCartItem', () => {
  it('adds an item and snapshots the current price', async () => {
    const item = await addCartItem(deviceToken, availableDishId, 2, 'sin sal')
    expect(item.quantity).toBe(2)
    expect(item.unitPriceSnapshot).toBe(10)
    expect(item.notes).toBe('sin sal')
  })

  it('rejects adding an unavailable dish', async () => {
    await expect(addCartItem(deviceToken, unavailableDishId, 1)).rejects.toThrow()
  })
})
