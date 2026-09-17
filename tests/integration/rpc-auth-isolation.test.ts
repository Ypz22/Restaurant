// Aislamiento multi-tenant del staff (2026-09-17-auth-multitenant-design.md):
// un admin de un restaurante nunca puede operar el de otro, cocina no puede
// llamar a las RPC exclusivas de admin, anon no puede llamar ninguna RPC de
// admin/plataforma, y un platform_admin sin fila en restaurant_staff tampoco
// opera el día a día de un restaurante.
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

async function makeRestaurant() {
  const { data } = await service
    .from('restaurants').insert({ name: 'T', slug: 'iso-' + Date.now() + Math.random() }).select().single()
  return data!.id as string
}

async function makeStaffSession(): Promise<SupabaseClient> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}

async function signIn(client: SupabaseClient, email: string, password: string) {
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
}

async function createStaffUser(): Promise<{ userId: string; email: string; password: string }> {
  const email = `iso-${crypto.randomUUID()}@test.local`
  const password = 'password123!'
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  return { userId: data.user.id, email, password }
}

async function grantRole(restaurantId: string, userId: string, role: 'admin' | 'kitchen') {
  const { error } = await service.from('restaurant_staff').insert({ restaurant_id: restaurantId, user_id: userId, role })
  if (error) throw error
}

async function grantPlatformAdmin(userId: string) {
  const { error } = await service.from('platform_admins').insert({ user_id: userId })
  if (error) throw error
}

let restaurantA: string
let restaurantB: string
let adminA: SupabaseClient
let kitchenA: SupabaseClient
let platformOnly: SupabaseClient

beforeAll(async () => {
  restaurantA = await makeRestaurant()
  restaurantB = await makeRestaurant()

  const adminAUser = await createStaffUser()
  await grantRole(restaurantA, adminAUser.userId, 'admin')
  adminA = await makeStaffSession()
  await signIn(adminA, adminAUser.email, adminAUser.password)

  const kitchenAUser = await createStaffUser()
  await grantRole(restaurantA, kitchenAUser.userId, 'kitchen')
  kitchenA = await makeStaffSession()
  await signIn(kitchenA, kitchenAUser.email, kitchenAUser.password)

  const platformUser = await createStaffUser()
  await grantPlatformAdmin(platformUser.userId)
  platformOnly = await makeStaffSession()
  await signIn(platformOnly, platformUser.email, platformUser.password)
})

describe('rpc_admin_* isolation between tenants', () => {
  it('admin of restaurant A cannot read tables of restaurant B', async () => {
    const { error } = await adminA.rpc('rpc_admin_get_tables', { p_restaurant_id: restaurantB })
    expect(error?.message).toBe('forbidden')
  })

  it('admin of restaurant A cannot mutate the menu of restaurant B', async () => {
    const { error } = await adminA.rpc('rpc_admin_upsert_category', {
      p_restaurant_id: restaurantB, p_id: null, p_name: 'Intruso', p_sort_order: 1,
    })
    expect(error?.message).toBe('forbidden')
  })

  it('admin of restaurant A can operate on its own restaurant', async () => {
    const { error } = await adminA.rpc('rpc_admin_get_tables', { p_restaurant_id: restaurantA })
    expect(error).toBeNull()
  })
})

describe('rpc_admin_* role scoping', () => {
  it('kitchen cannot call an admin-only RPC', async () => {
    const { error } = await kitchenA.rpc('rpc_admin_upsert_category', {
      p_restaurant_id: restaurantA, p_id: null, p_name: 'Intruso', p_sort_order: 1,
    })
    expect(error?.message).toBe('forbidden')
  })

  it('kitchen can call the KDS RPCs of its own restaurant', async () => {
    const { error } = await kitchenA.rpc('rpc_admin_get_active_tickets', { p_restaurant_id: restaurantA })
    expect(error).toBeNull()
  })
})

describe('rpc_admin_* / rpc_platform_* require an authenticated staff session', () => {
  it('anon cannot execute rpc_admin_get_tables at all', async () => {
    const { error } = await anon.rpc('rpc_admin_get_tables', { p_restaurant_id: restaurantA })
    expect(error?.message).toContain('permission denied')
  })

  it('anon cannot execute rpc_platform_list_restaurants at all', async () => {
    const { error } = await anon.rpc('rpc_platform_list_restaurants')
    expect(error?.message).toContain('permission denied')
  })
})

describe('platform_admin does not inherit restaurant staff access', () => {
  it('a platform_admin without a restaurant_staff row cannot operate the KDS', async () => {
    const { error } = await platformOnly.rpc('rpc_admin_get_active_tickets', { p_restaurant_id: restaurantA })
    expect(error?.message).toBe('forbidden')
  })

  it('a restaurant admin cannot call platform-only RPCs', async () => {
    const { error } = await adminA.rpc('rpc_platform_list_restaurants')
    expect(error?.message).toBe('forbidden')
  })

  it('a platform_admin can list restaurants', async () => {
    const { error } = await platformOnly.rpc('rpc_platform_list_restaurants')
    expect(error).toBeNull()
  })
})
