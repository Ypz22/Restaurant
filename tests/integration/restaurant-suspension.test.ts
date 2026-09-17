// Baja lógica de un restaurante (2026-09-17-auth-multitenant-design.md):
// suspenderlo bloquea de inmediato al staff y al comensal, sin borrar datos;
// reactivarlo devuelve todo a la normalidad.
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
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
let qrToken: string
let adminClient: SupabaseClient

async function setStatus(status: 'active' | 'suspended') {
  const { error } = await service.from('restaurants').update({ status }).eq('id', restaurantId)
  if (error) throw error
}

beforeAll(async () => {
  const { data: restaurant } = await service
    .from('restaurants').insert({ name: 'Suspendible', slug: 'susp-' + Date.now() }).select().single()
  restaurantId = restaurant!.id

  const { data: category } = await service
    .from('menu_categories').insert({ restaurant_id: restaurantId, name: 'Cat' }).select().single()
  await service.from('dishes').insert({ restaurant_id: restaurantId, category_id: category!.id, name: 'Plato', price: 10 })

  const { data: table } = await service
    .from('tables').insert({ restaurant_id: restaurantId, label: 'M1' }).select().single()
  qrToken = table!.qr_token

  const email = `susp-${crypto.randomUUID()}@test.local`
  const password = 'password123!'
  const { data: user } = await service.auth.admin.createUser({ email, password, email_confirm: true })
  await service.from('restaurant_staff').insert({ restaurant_id: restaurantId, user_id: user!.user!.id, role: 'admin' })
  adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  await adminClient.auth.signInWithPassword({ email, password })
})

afterAll(async () => {
  await setStatus('active')
})

describe('a suspended restaurant blocks staff and diners', () => {
  it('blocks the admin RPCs with restaurant_suspended', async () => {
    await setStatus('suspended')
    const { error } = await adminClient.rpc('rpc_admin_get_tables', { p_restaurant_id: restaurantId })
    expect(error?.message).toBe('restaurant_suspended')
  })

  it('blocks a diner scanning the table QR', async () => {
    const { error } = await anon.rpc('rpc_get_table', { p_qr_token: qrToken })
    expect(error?.message).toBe('restaurant_suspended')
  })

  it('hides the menu from public reads', async () => {
    const { data, error } = await anon.from('dishes').select('id').eq('restaurant_id', restaurantId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('reactivating restores staff and diner access', async () => {
    await setStatus('active')

    const staffResult = await adminClient.rpc('rpc_admin_get_tables', { p_restaurant_id: restaurantId })
    expect(staffResult.error).toBeNull()

    const dinerResult = await anon.rpc('rpc_get_table', { p_qr_token: qrToken })
    expect(dinerResult.error).toBeNull()
    expect(dinerResult.data).toHaveLength(1)

    const { data } = await anon.from('dishes').select('id').eq('restaurant_id', restaurantId)
    expect(data).toHaveLength(1)
  })
})
