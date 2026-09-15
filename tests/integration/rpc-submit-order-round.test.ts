import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { addCartItem, getCart } from '@/lib/data/cart'
import { startSession } from '@/lib/data/session'
import { submitOrderRound } from '@/lib/data/orders'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setupTableWithDish() {
  const { data: restaurant } = await admin
    .from('restaurants').insert({ name: 'T', slug: 'submit-' + Date.now() + Math.random() }).select().single()
  const { data: table } = await admin
    .from('tables').insert({ restaurant_id: restaurant!.id, label: 'T1' }).select().single()
  const { data: category } = await admin
    .from('menu_categories').insert({ restaurant_id: restaurant!.id, name: 'Cat' }).select().single()
  const { data: dish } = await admin
    .from('dishes').insert({
      restaurant_id: restaurant!.id, category_id: category!.id, name: 'Plato', price: 10,
    }).select().single()
  return { table: table!, dish: dish! }
}

describe('submitOrderRound', () => {
  it('moves in_cart items to submitted under one order_round', async () => {
    const { table, dish } = await setupTableWithDish()
    const session = await startSession(table.qr_token, 'Ana')
    await addCartItem(session.deviceToken, dish.id, 2)

    const round = await submitOrderRound(session.deviceToken)
    expect(round.status).toBe('pending')

    const remaining = await getCart(session.tableSessionId)
    expect(remaining).toHaveLength(0)

    const { data: submittedItems } = await admin
      .from('cart_items')
      .select('status, order_round_id')
      .eq('table_session_id', session.tableSessionId)
    expect(submittedItems?.every((i) => i.status === 'submitted' && i.order_round_id === round.id)).toBe(true)
  })

  it('rejects submitting an empty cart', async () => {
    const { table } = await setupTableWithDish()
    const session = await startSession(table.qr_token, 'Ana')
    await expect(submitOrderRound(session.deviceToken)).rejects.toThrow()
  })

  it('under concurrent submits from the same table, only one round is created', async () => {
    const { table, dish } = await setupTableWithDish()
    const session = await startSession(table.qr_token, 'Ana')
    await addCartItem(session.deviceToken, dish.id, 1)

    const results = await Promise.allSettled([
      submitOrderRound(session.deviceToken),
      submitOrderRound(session.deviceToken),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)

    const { data: rounds } = await admin
      .from('order_rounds')
      .select('id')
      .eq('table_session_id', session.tableSessionId)
    expect(rounds).toHaveLength(1)
  })
})
