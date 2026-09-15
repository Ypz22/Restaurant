import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getCart, addCartItem } from '@/lib/data/cart'
import { startSession } from '@/lib/data/session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let tableSessionId: string
let deviceToken: string

beforeAll(async () => {
  const { data: restaurant } = await admin
    .from('restaurants').insert({ name: 'T', slug: 'get-cart-' + Date.now() }).select().single()
  const { data: table } = await admin
    .from('tables').insert({ restaurant_id: restaurant!.id, label: 'T1' }).select().single()
  const { data: category } = await admin
    .from('menu_categories').insert({ restaurant_id: restaurant!.id, name: 'Cat' }).select().single()
  const { data: dish } = await admin
    .from('dishes').insert({
      restaurant_id: restaurant!.id, category_id: category!.id, name: 'Plato', price: 10,
    }).select().single()

  const session = await startSession(table!.qr_token, 'Ana')
  tableSessionId = session.tableSessionId
  deviceToken = session.deviceToken
  await addCartItem(deviceToken, dish!.id, 1)
})

describe('getCart', () => {
  it('returns in-cart items with dish name and diner nickname', async () => {
    const items = await getCart(tableSessionId)
    expect(items).toHaveLength(1)
    expect(items[0].dishName).toBe('Plato')
    expect(items[0].dinerNickname).toBe('Ana')
  })
})
