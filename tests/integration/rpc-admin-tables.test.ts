// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import {
  createTable, renameTable, setTableAvailability, regenerateTableQr, deleteTable,
} from '@/lib/data/admin-tables'
import { getTableByQrToken } from '@/lib/data/table'
import { startSession } from '@/lib/data/session'
import { grantAdmin } from './helpers/staff-session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function makeRestaurant() {
  const { data } = await admin
    .from('restaurants').insert({ name: 'T', slug: 'tables-' + Date.now() + Math.random() }).select().single()
  await grantAdmin(data!.id)
  return data!.id as string
}

describe('admin table management RPCs', () => {
  it('creates a table with a QR token and rejects duplicate or empty labels', async () => {
    const restaurantId = await makeRestaurant()
    const table = await createTable(restaurantId, '  Mesa 05 ')
    expect(table).toMatchObject({ label: 'Mesa 05', availability: 'available', session: null })
    expect(table.qrToken).toMatch(/^[0-9a-f-]{36}$/)

    await expect(createTable(restaurantId, 'mesa 05')).rejects.toThrow('Ya existe')
    await expect(createTable(restaurantId, '   ')).rejects.toThrow()
  })

  it('allows the same label in different restaurants', async () => {
    const restaurantA = await makeRestaurant()
    const restaurantB = await makeRestaurant()
    await createTable(restaurantA, 'Mesa 1')
    await expect(createTable(restaurantB, 'Mesa 1')).resolves.toMatchObject({ label: 'Mesa 1' })
  })

  it('renames a table, rejecting another table\'s label but accepting its own', async () => {
    const restaurantId = await makeRestaurant()
    const one = await createTable(restaurantId, 'Mesa 1')
    await createTable(restaurantId, 'Mesa 2')

    await expect(renameTable(restaurantId, one.id, 'Mesa 2')).rejects.toThrow('Ya existe')
    await expect(renameTable(restaurantId, one.id, 'MESA 1')).resolves.toMatchObject({ label: 'MESA 1' })
    await expect(renameTable(restaurantId, one.id, 'Terraza')).resolves.toMatchObject({ label: 'Terraza' })
  })

  it('blocks scanning an unavailable table', async () => {
    const restaurantId = await makeRestaurant()
    const table = await createTable(restaurantId, 'Mesa 1')
    await setTableAvailability(restaurantId, table.id, 'unavailable')

    expect((await getTableByQrToken(table.qrToken))?.availability).toBe('unavailable')
    await expect(startSession(table.qrToken, 'Ana')).rejects.toThrow('table_unavailable')
  })

  it('releases a reserved table when a diner scans it', async () => {
    const restaurantId = await makeRestaurant()
    const table = await createTable(restaurantId, 'Mesa 1')
    await setTableAvailability(restaurantId, table.id, 'reserved')

    await startSession(table.qrToken, 'Ana')
    const { data } = await admin.from('tables').select('availability').eq('id', table.id).single()
    expect(data!.availability).toBe('available')
  })

  it('rejects changing availability or regenerating the QR of an occupied table', async () => {
    const restaurantId = await makeRestaurant()
    const table = await createTable(restaurantId, 'Mesa 1')
    await startSession(table.qrToken, 'Ana')

    await expect(setTableAvailability(restaurantId, table.id, 'unavailable')).rejects.toThrow('ocupada')
    await expect(regenerateTableQr(restaurantId, table.id)).rejects.toThrow('ocupada')
  })

  it('regenerates the QR token and invalidates the old one', async () => {
    const restaurantId = await makeRestaurant()
    const table = await createTable(restaurantId, 'Mesa 1')
    const regenerated = await regenerateTableQr(restaurantId, table.id)

    expect(regenerated.qrToken).not.toBe(table.qrToken)
    expect(await getTableByQrToken(table.qrToken)).toBeNull()
    expect((await getTableByQrToken(regenerated.qrToken))?.tableId).toBe(table.id)
  })

  it('deletes an unused table but refuses one with session history', async () => {
    const restaurantId = await makeRestaurant()
    const unused = await createTable(restaurantId, 'Mesa 1')
    await deleteTable(restaurantId, unused.id)
    const { data } = await admin.from('tables').select('id').eq('id', unused.id)
    expect(data).toHaveLength(0)

    const used = await createTable(restaurantId, 'Mesa 2')
    await admin.from('table_sessions').insert({ table_id: used.id, status: 'closed', closed_at: new Date().toISOString() })
    await expect(deleteTable(restaurantId, used.id)).rejects.toThrow('No disponible')
  })

  it('rejects every mutation on a table from another restaurant', async () => {
    const restaurantA = await makeRestaurant()
    const restaurantB = await makeRestaurant()
    const tableB = await createTable(restaurantB, 'Mesa B')

    await expect(renameTable(restaurantA, tableB.id, 'Robada')).rejects.toThrow()
    await expect(setTableAvailability(restaurantA, tableB.id, 'unavailable')).rejects.toThrow()
    await expect(regenerateTableQr(restaurantA, tableB.id)).rejects.toThrow()
    await expect(deleteTable(restaurantA, tableB.id)).rejects.toThrow()
  })
})
