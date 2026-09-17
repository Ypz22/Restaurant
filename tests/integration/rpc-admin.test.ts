// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import {
  upsertCategory, deleteCategory, upsertDish, deleteDish, setDishAvailability,
} from '@/lib/data/admin-menu'
import { closeTableSession, acknowledgeRequest, getTablesWithSessions, getPendingRequests } from '@/lib/data/admin-tables'
import { advanceOrderRound, getActiveTickets, setItemPrepared } from '@/lib/data/admin-kitchen'
import { grantAdmin } from './helpers/staff-session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function makeRestaurant() {
  const { data } = await admin
    .from('restaurants').insert({ name: 'T', slug: 'admin-' + Date.now() + Math.random() }).select().single()
  await grantAdmin(data!.id)
  return data!.id as string
}

async function makeTableSession(restaurantId: string) {
  const { data: table } = await admin
    .from('tables').insert({ restaurant_id: restaurantId, label: 'M1' }).select().single()
  const { data: session } = await admin
    .from('table_sessions').insert({ table_id: table!.id, status: 'open' }).select().single()
  return session!.id as string
}

async function makeOrderRound(restaurantId: string, status: string) {
  const sessionId = await makeTableSession(restaurantId)
  const { data: round } = await admin
    .from('order_rounds').insert({ table_session_id: sessionId, status }).select().single()
  return round!.id as string
}

describe('admin menu RPCs', () => {
  it('creates, updates and deletes a category', async () => {
    const restaurantId = await makeRestaurant()
    const created = await upsertCategory(restaurantId, { name: 'Entradas', sortOrder: 1 })
    expect(created.name).toBe('Entradas')

    const updated = await upsertCategory(restaurantId, { id: created.id, name: 'Entradas Frías', sortOrder: 2 })
    expect(updated).toMatchObject({ id: created.id, name: 'Entradas Frías', sortOrder: 2 })

    await deleteCategory(restaurantId, created.id)
    const { data } = await admin.from('menu_categories').select('id').eq('id', created.id)
    expect(data).toHaveLength(0)
  })

  it('refuses to delete a category that still has dishes', async () => {
    const restaurantId = await makeRestaurant()
    const category = await upsertCategory(restaurantId, { name: 'Cat', sortOrder: 0 })
    await upsertDish(restaurantId, {
      categoryId: category.id, name: 'Plato', description: '', price: 10, photoUrl: null, isAvailable: true,
    })
    await expect(deleteCategory(restaurantId, category.id)).rejects.toThrow()
  })

  it('creates a dish, toggles availability and deletes it', async () => {
    const restaurantId = await makeRestaurant()
    const category = await upsertCategory(restaurantId, { name: 'Cat', sortOrder: 0 })
    const dish = await upsertDish(restaurantId, {
      categoryId: category.id, name: 'Plato', description: 'Rico', price: 12.5, photoUrl: null, isAvailable: true,
    })
    expect(dish.isAvailable).toBe(true)

    await setDishAvailability(restaurantId, dish.id, false)
    const { data: row } = await admin.from('dishes').select('is_available').eq('id', dish.id).single()
    expect(row!.is_available).toBe(false)

    await deleteDish(restaurantId, dish.id)
    const { data } = await admin.from('dishes').select('id').eq('id', dish.id)
    expect(data).toHaveLength(0)
  })

  it('rejects writing a dish into another restaurant\'s category', async () => {
    const restaurantA = await makeRestaurant()
    const restaurantB = await makeRestaurant()
    const categoryB = await upsertCategory(restaurantB, { name: 'Cat B', sortOrder: 0 })

    await expect(
      upsertDish(restaurantA, {
        categoryId: categoryB.id, name: 'Intruso', description: '', price: 5, photoUrl: null, isAvailable: true,
      })
    ).rejects.toThrow()
  })
})

describe('admin read RPCs are scoped per restaurant', () => {
  it('only lists tables belonging to the given restaurant', async () => {
    const restaurantA = await makeRestaurant()
    const restaurantB = await makeRestaurant()
    await admin.from('tables').insert({ restaurant_id: restaurantA, label: 'A1' })
    await admin.from('tables').insert({ restaurant_id: restaurantB, label: 'B1' })

    const tables = await getTablesWithSessions(restaurantA)
    expect(tables.map((t) => t.label)).toEqual(['A1'])
  })

  it('only lists pending requests for the given restaurant', async () => {
    const restaurantA = await makeRestaurant()
    const restaurantB = await makeRestaurant()
    const sessionA = await makeTableSession(restaurantA)
    const sessionB = await makeTableSession(restaurantB)
    await admin.from('table_requests').insert({ table_session_id: sessionA, type: 'agua', status: 'pending' })
    await admin.from('table_requests').insert({ table_session_id: sessionB, type: 'agua', status: 'pending' })

    const requests = await getPendingRequests(restaurantA)
    expect(requests).toHaveLength(1)
  })

  it('only lists active tickets for the given restaurant', async () => {
    const restaurantA = await makeRestaurant()
    const restaurantB = await makeRestaurant()
    await makeOrderRound(restaurantA, 'pending')
    await makeOrderRound(restaurantB, 'pending')

    const tickets = await getActiveTickets(restaurantA)
    expect(tickets).toHaveLength(1)
  })
})

describe('admin table/request RPCs', () => {
  it('closes an open table session and is idempotent', async () => {
    const restaurantId = await makeRestaurant()
    const sessionId = await makeTableSession(restaurantId)

    await closeTableSession(restaurantId, sessionId)
    const { data: first } = await admin.from('table_sessions').select('status').eq('id', sessionId).single()
    expect(first!.status).toBe('closed')

    await expect(closeTableSession(restaurantId, sessionId)).resolves.not.toThrow()
  })

  it('rejects closing a session that belongs to another restaurant', async () => {
    const restaurantA = await makeRestaurant()
    const restaurantB = await makeRestaurant()
    const sessionId = await makeTableSession(restaurantB)
    await expect(closeTableSession(restaurantA, sessionId)).rejects.toThrow()
  })

  it('acknowledges a pending table request', async () => {
    const restaurantId = await makeRestaurant()
    const sessionId = await makeTableSession(restaurantId)
    const { data: request } = await admin
      .from('table_requests')
      .insert({ table_session_id: sessionId, type: 'llamar_mesero', status: 'pending' })
      .select().single()

    await acknowledgeRequest(restaurantId, request!.id)
    const { data: row } = await admin.from('table_requests').select('status').eq('id', request!.id).single()
    expect(row!.status).toBe('acknowledged')
  })
})

describe('admin KDS RPC: rpc_admin_advance_order_round', () => {
  it('walks pending -> preparing -> ready -> delivered', async () => {
    const restaurantId = await makeRestaurant()
    const roundId = await makeOrderRound(restaurantId, 'pending')
    // Ronda sin ítems: nada que marcar, puede pasar a ready.

    await advanceOrderRound(restaurantId, roundId, 'preparing')
    await advanceOrderRound(restaurantId, roundId, 'ready')
    await advanceOrderRound(restaurantId, roundId, 'delivered')

    const { data } = await admin.from('order_rounds').select('status').eq('id', roundId).single()
    expect(data!.status).toBe('delivered')
  })

  it('rejects skipping a status', async () => {
    const restaurantId = await makeRestaurant()
    const roundId = await makeOrderRound(restaurantId, 'pending')
    await expect(advanceOrderRound(restaurantId, roundId, 'ready')).rejects.toThrow()
  })

  it('rejects going backwards', async () => {
    const restaurantId = await makeRestaurant()
    const roundId = await makeOrderRound(restaurantId, 'preparing')
    await expect(advanceOrderRound(restaurantId, roundId, 'pending')).rejects.toThrow()
  })

  it('rejects advancing a round from another restaurant', async () => {
    const restaurantA = await makeRestaurant()
    const restaurantB = await makeRestaurant()
    const roundId = await makeOrderRound(restaurantB, 'pending')
    await expect(advanceOrderRound(restaurantA, roundId, 'preparing')).rejects.toThrow()
  })
})

async function makeRoundWithItems(restaurantId: string, status: string, count: number) {
  const sessionId = await makeTableSession(restaurantId)
  const { data: category } = await admin.from('menu_categories').insert({ restaurant_id: restaurantId, name: 'C' }).select().single()
  const { data: dish } = await admin
    .from('dishes').insert({ restaurant_id: restaurantId, category_id: category!.id, name: 'Lomo', price: 10 }).select().single()
  const { data: diner } = await admin.from('diners').insert({ table_session_id: sessionId, nickname: 'T' }).select().single()
  const { data: round } = await admin.from('order_rounds').insert({ table_session_id: sessionId, status }).select().single()
  const { data: items } = await admin.from('cart_items').insert(
    Array.from({ length: count }, () => ({
      table_session_id: sessionId, dish_id: dish!.id, diner_id: diner!.id,
      quantity: 1, unit_price_snapshot: 10, status: 'submitted', order_round_id: round!.id,
    }))
  ).select()
  return { roundId: round!.id as string, itemIds: items!.map((i) => i.id as string) }
}

describe('admin KDS RPC: rpc_admin_set_item_prepared', () => {
  it('marks an item and moves a pending round to preparing', async () => {
    const restaurantId = await makeRestaurant()
    const { roundId, itemIds } = await makeRoundWithItems(restaurantId, 'pending', 2)

    expect(await setItemPrepared(restaurantId, itemIds[0], true)).toBe('preparing')
    const { data: item } = await admin.from('cart_items').select('prepared_at').eq('id', itemIds[0]).single()
    expect(item!.prepared_at).not.toBeNull()
    const { data: round } = await admin.from('order_rounds').select('status').eq('id', roundId).single()
    expect(round!.status).toBe('preparing')

    await setItemPrepared(restaurantId, itemIds[0], false)
    const { data: unmarked } = await admin.from('cart_items').select('prepared_at').eq('id', itemIds[0]).single()
    expect(unmarked!.prepared_at).toBeNull()
  })

  it('exposes preparedAt in active tickets', async () => {
    const restaurantId = await makeRestaurant()
    const { itemIds } = await makeRoundWithItems(restaurantId, 'preparing', 1)
    await setItemPrepared(restaurantId, itemIds[0], true)

    const [ticket] = await getActiveTickets(restaurantId)
    expect(ticket.items[0].preparedAt).not.toBeNull()
  })

  it('rejects ready while items are unprepared, allows it once all are marked', async () => {
    const restaurantId = await makeRestaurant()
    const { roundId, itemIds } = await makeRoundWithItems(restaurantId, 'preparing', 2)

    await setItemPrepared(restaurantId, itemIds[0], true)
    await expect(advanceOrderRound(restaurantId, roundId, 'ready')).rejects.toThrow()

    await setItemPrepared(restaurantId, itemIds[1], true)
    await expect(advanceOrderRound(restaurantId, roundId, 'ready')).resolves.not.toThrow()
  })

  it('rejects changing items of a round that is already ready', async () => {
    const restaurantId = await makeRestaurant()
    const { itemIds } = await makeRoundWithItems(restaurantId, 'ready', 1)
    await expect(setItemPrepared(restaurantId, itemIds[0], true)).rejects.toThrow()
  })

  it('rejects an item from another restaurant', async () => {
    const restaurantA = await makeRestaurant()
    const restaurantB = await makeRestaurant()
    const { itemIds } = await makeRoundWithItems(restaurantB, 'pending', 1)
    await expect(setItemPrepared(restaurantA, itemIds[0], true)).rejects.toThrow()
  })
})
