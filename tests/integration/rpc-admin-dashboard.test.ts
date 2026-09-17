// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getSalesReport } from '@/lib/data/admin-dashboard'
import { grantAdmin } from './helpers/staff-session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function makeRestaurant() {
  const { data } = await admin
    .from('restaurants').insert({ name: 'T', slug: 'dash-' + Date.now() + Math.random() }).select().single()
  await grantAdmin(data!.id)
  return data!.id as string
}

async function seedSubmittedOrder(
  restaurantId: string, dishName: string, price: number, quantity: number, submittedAt = new Date()
) {
  const { data: table } = await admin.from('tables').insert({ restaurant_id: restaurantId, label: 'M1' }).select().single()
  const { data: session } = await admin.from('table_sessions').insert({ table_id: table!.id, status: 'open' }).select().single()
  const { data: category } = await admin.from('menu_categories').insert({ restaurant_id: restaurantId, name: 'Cat' }).select().single()
  const { data: dish } = await admin
    .from('dishes').insert({ restaurant_id: restaurantId, category_id: category!.id, name: dishName, price }).select().single()
  const { data: diner } = await admin.from('diners').insert({ table_session_id: session!.id, nickname: 'T' }).select().single()
  const { data: round } = await admin
    .from('order_rounds')
    .insert({ table_session_id: session!.id, status: 'pending', submitted_at: submittedAt.toISOString() })
    .select().single()
  await admin.from('cart_items').insert({
    table_session_id: session!.id, dish_id: dish!.id, diner_id: diner!.id,
    quantity, unit_price_snapshot: price, status: 'submitted', order_round_id: round!.id,
  })
  return { tableId: table!.id, sessionId: session!.id, roundId: round!.id }
}

const DAY_MS = 24 * 60 * 60 * 1000

describe('rpc_admin_get_sales_report', () => {
  it('sums revenue, orders and avg ticket for today', async () => {
    const restaurantId = await makeRestaurant()
    await seedSubmittedOrder(restaurantId, 'Plato A', 10, 2)
    await seedSubmittedOrder(restaurantId, 'Plato B', 5, 4)

    const report = await getSalesReport(restaurantId, 'day')
    expect(report.kpis).toMatchObject({ revenue: 40, orders: 2, avgTicket: 20, openTables: 2 })
  })

  it('puts yesterday\'s orders in the previous period, not the current one', async () => {
    const restaurantId = await makeRestaurant()
    await seedSubmittedOrder(restaurantId, 'Plato A', 10, 1, new Date(Date.now() - DAY_MS))

    const report = await getSalesReport(restaurantId, 'day')
    expect(report.kpis.revenue).toBe(0)
    expect(report.kpis.prevRevenue).toBe(10)
    expect(report.topDishes).toEqual([])
  })

  it('returns one bucket per hour, day or month depending on the period', async () => {
    const restaurantId = await makeRestaurant()
    expect((await getSalesReport(restaurantId, 'day')).series).toHaveLength(24)
    expect((await getSalesReport(restaurantId, 'week')).series).toHaveLength(7)
    expect((await getSalesReport(restaurantId, 'month')).series).toHaveLength(30)
    expect((await getSalesReport(restaurantId, 'year')).series).toHaveLength(12)
  })

  it('ranks top dishes by quantity within the period and groups by category', async () => {
    const restaurantId = await makeRestaurant()
    await seedSubmittedOrder(restaurantId, 'Popular', 8, 5)
    await seedSubmittedOrder(restaurantId, 'Unpopular', 8, 1)
    await seedSubmittedOrder(restaurantId, 'Old', 8, 50, new Date(Date.now() - 10 * DAY_MS))

    const report = await getSalesReport(restaurantId, 'week')
    expect(report.topDishes).toEqual([
      { dish: 'Popular', quantity: 5, revenue: 40 },
      { dish: 'Unpopular', quantity: 1, revenue: 8 },
    ])
    expect(report.byCategory).toEqual([{ category: 'Cat', revenue: 48 }])
  })

  it('is scoped per restaurant', async () => {
    const restaurantA = await makeRestaurant()
    const restaurantB = await makeRestaurant()
    await seedSubmittedOrder(restaurantA, 'Plato A', 10, 1)
    await seedSubmittedOrder(restaurantB, 'Plato B', 999, 1)

    const report = await getSalesReport(restaurantA, 'day')
    expect(report.kpis.revenue).toBe(10)
  })

  it('rejects an invalid period', async () => {
    const restaurantId = await makeRestaurant()
    await expect(getSalesReport(restaurantId, 'decade' as never)).rejects.toThrow()
  })
})
