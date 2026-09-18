import { describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { addCartItem } from '@/lib/data/cart'
import { submitOrderRound } from '@/lib/data/orders'
import { startSession } from '@/lib/data/session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('rpc_get_order_history', () => {
  it('returns every submitted round for the table in reverse chronological order', async () => {
    const suffix = `${Date.now()}-${Math.random()}`
    const { data: restaurant } = await admin
      .from('restaurants').insert({ name: 'Historial', slug: `historial-${suffix}` }).select().single()
    const { data: table } = await admin
      .from('tables').insert({ restaurant_id: restaurant!.id, label: 'Mesa historial' }).select().single()
    const { data: category } = await admin
      .from('menu_categories').insert({ restaurant_id: restaurant!.id, name: 'Principal' }).select().single()
    const { data: dish } = await admin
      .from('dishes').insert({ restaurant_id: restaurant!.id, category_id: category!.id, name: 'Plato historial', price: 12 }).select().single()
    const session = await startSession(table!.qr_token, 'Ana')

    await addCartItem(session.deviceToken, dish!.id, 1)
    const firstRound = await submitOrderRound(session.deviceToken)
    await addCartItem(session.deviceToken, dish!.id, 1)
    await addCartItem(session.deviceToken, dish!.id, 1)
    const secondRound = await submitOrderRound(session.deviceToken)

    const { data, error } = await admin.rpc('rpc_get_order_history', { p_device_token: session.deviceToken })

    expect(error).toBeNull()
    expect(data).toHaveLength(2)
    expect(data.map((round: { round_id: string }) => round.round_id)).toEqual([secondRound.id, firstRound.id])
    expect(data[0].items).toHaveLength(2)
    expect(new Set(data[0].items.map((item: { id: string }) => item.id)).size).toBe(2)
    expect(data[0].items).toEqual([
      expect.objectContaining({ dish_name: 'Plato historial', quantity: 1, notes: '', unit_price: 12 }),
      expect.objectContaining({ dish_name: 'Plato historial', quantity: 1, notes: '', unit_price: 12 }),
    ])
  })
})
