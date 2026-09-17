// RLS de las tablas globales de staff (2026-09-17-auth-multitenant-design.md):
// una cuenta autenticada solo puede leer sus propias filas de restaurant_staff
// y platform_admins, y no puede insertar, actualizar ni borrar ninguna fila
// directamente (solo las RPC security definer pueden escribirlas).
import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

let restaurantId: string
let ownUserId: string
let otherUserId: string
let ownClient: SupabaseClient

beforeAll(async () => {
  const { data: restaurant } = await service
    .from('restaurants').insert({ name: 'RLS', slug: 'staff-rls-' + Date.now() }).select().single()
  restaurantId = restaurant!.id

  const email = `staffrls-${crypto.randomUUID()}@test.local`
  const password = 'password123!'
  const { data: user } = await service.auth.admin.createUser({ email, password, email_confirm: true })
  ownUserId = user!.user!.id
  await service.from('restaurant_staff').insert({ restaurant_id: restaurantId, user_id: ownUserId, role: 'admin' })

  const { data: other } = await service.auth.admin.createUser({
    email: `staffrls-other-${crypto.randomUUID()}@test.local`, password: 'password123!', email_confirm: true,
  })
  otherUserId = other!.user!.id
  await service.from('restaurant_staff').insert({ restaurant_id: restaurantId, user_id: otherUserId, role: 'kitchen' })
  await service.from('platform_admins').insert({ user_id: otherUserId })

  ownClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  await ownClient.auth.signInWithPassword({ email, password })
})

describe('restaurant_staff RLS', () => {
  it('anon reads nothing', async () => {
    const { data, error } = await anon.from('restaurant_staff').select('*')
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('an authenticated staff account only sees its own row, never a colleague\'s', async () => {
    const { data } = await ownClient.from('restaurant_staff').select('*').eq('restaurant_id', restaurantId)
    expect(data).toHaveLength(1)
    expect(data![0].user_id).toBe(ownUserId)
  })

  it('cannot insert, update or delete directly', async () => {
    const insert = await ownClient.from('restaurant_staff')
      .insert({ restaurant_id: restaurantId, user_id: ownUserId, role: 'admin' })
    expect(insert.error).not.toBeNull()

    // Sin política de update/delete, RLS filtra la fila antes de aplicar el
    // cambio: PostgREST no lo reporta como error, pero la fila queda intacta.
    await ownClient.from('restaurant_staff')
      .update({ role: 'kitchen' }).eq('restaurant_id', restaurantId).eq('user_id', ownUserId)
    await ownClient.from('restaurant_staff')
      .delete().eq('restaurant_id', restaurantId).eq('user_id', ownUserId)

    const { data } = await service.from('restaurant_staff')
      .select('role').eq('restaurant_id', restaurantId).eq('user_id', ownUserId).single()
    expect(data!.role).toBe('admin')
  })
})

describe('platform_admins RLS', () => {
  it('an authenticated account that is not platform_admin sees no rows', async () => {
    const { data } = await ownClient.from('platform_admins').select('*')
    expect(data).toHaveLength(0)
  })

  it('cannot insert itself as platform_admin', async () => {
    const { error } = await ownClient.from('platform_admins').insert({ user_id: ownUserId })
    expect(error).not.toBeNull()
  })
})
