import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getSalesSummary, getTopDishes } from '@/lib/data/admin-dashboard'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function makeRestaurant() {
  const { data } = await admin
    .from('restaurants').insert({ name: 'T', slug: 'dash-' + Date.now() + Math.random() }).select().single()
  return data!.id as string
}

async function seedSubmittedOrder(restaurantId: string, dishName: string, price: number, quantity: number) {
  const { data: table } = await admin.from('tables').insert({ restaurant_id: restaurantId, label: 'M1' }).select().single()
  const { data: session } = await admin.from('table_sessions').insert({ table_id: table!.id, status: 'open' }).select().single()
  const { data: category } = await admin.from('menu_categories').insert({ restaurant_id: restaurantId, name: 'Cat' }).select().single()
  const { data: dish } = await admin
    .from('dishes').insert({ restaurant_id: restaurantId, category_id: category!.id, name: dishName, price }).select().single()
  const { data: diner } = await admin.from('diners').insert({ table_session_id: session!.id, nickname: 'T' }).select().single()
  const { data: round } = await admin.from('order_rounds').insert({ table_session_id: session!.id, status: 'pending' }).select().single()
  await admin.from('cart_items').insert({
    table_session_id: session!.id, dish_id: dish!.id, diner_id: diner!.id,
    quantity, unit_price_snapshot: price, status: 'submitted', order_round_id: round!.id,
  })
  return { tableId: table!.id, sessionId: session!.id, roundId: round!.id }
}

describe('admin sales dashboard RPCs', () => {
  it('sums today\'s revenue, order count and avg ticket', async () => {
    const restaurantId = await makeRestaurant()
    await seedSubmittedOrder(restaurantId, 'Plato A', 10, 2)
    await seedSubmittedOrder(restaurantId, 'Plato B', 5, 4)

    const summary = await getSalesSummary(restaurantId)
    expect(summary.totalRevenue).toBe(40)
    expect(summary.orderCount).toBe(2)
    expect(summary.avgTicket).toBe(20)
  })

  it('counts open table sessions for the restaurant', async () => {
    const restaurantId = await makeRestaurant()
    await seedSubmittedOrder(restaurantId, 'Plato A', 10, 1)

    const summary = await getSalesSummary(restaurantId)
    expect(summary.openTables).toBe(1)
  })

  it('is scoped per restaurant and does not leak other tenants\' sales', async () => {
    const restaurantA = await makeRestaurant()
    const restaurantB = await makeRestaurant()
    await seedSubmittedOrder(restaurantA, 'Plato A', 10, 1)
    await seedSubmittedOrder(restaurantB, 'Plato B', 999, 1)

    const summary = await getSalesSummary(restaurantA)
    expect(summary.totalRevenue).toBe(10)
  })

  it('ranks top dishes by quantity sold', async () => {
    const restaurantId = await makeRestaurant()
    await seedSubmittedOrder(restaurantId, 'Popular', 8, 5)
    await seedSubmittedOrder(restaurantId, 'Unpopular', 8, 1)

    const topDishes = await getTopDishes(restaurantId)
    expect(topDishes[0]).toMatchObject({ name: 'Popular', quantity: 5, revenue: 40 })
    expect(topDishes[1]).toMatchObject({ name: 'Unpopular', quantity: 1, revenue: 8 })
  })

  it('returns an empty summary for a restaurant with no orders today', async () => {
    const restaurantId = await makeRestaurant()
    const summary = await getSalesSummary(restaurantId)
    expect(summary).toEqual({ totalRevenue: 0, orderCount: 0, avgTicket: 0, openTables: 0 })
  })
})
