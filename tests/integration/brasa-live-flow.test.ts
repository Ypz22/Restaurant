import { describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const qrToken = '33333333-3333-3333-3333-333333333333'

async function join() {
  const { data, error } = await supabase
    .rpc('rpc_start_session', {
      p_qr_token: qrToken,
      p_nickname: `Brasa-${crypto.randomUUID().slice(0, 8)}`,
    })
    .single()
  expect(error).toBeNull()
  return data as { device_token: string }
}

describe('Sabor & Brasa live flow', () => {
  it('does not expose diner tokens or private table records to the public key', async () => {
    for (const table of ['tables', 'diners', 'table_sessions', 'cart_items', 'order_rounds', 'table_requests']) {
      const { error } = await supabase.from(table).select('*').limit(1)
      expect(error, `${table} should require a private RPC`).not.toBeNull()
    }
  })

  it('loads the branded menu with real photo URLs', async () => {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', 'sabor-brasa')
      .single()
    const { data: dishes, error } = await supabase
      .from('dishes')
      .select('name, photo_url, is_available')
      .eq('restaurant_id', restaurant!.id)

    expect(error).toBeNull()
    expect(dishes?.find((dish) => dish.name === 'Costillar al Quebracho')).toMatchObject({
      photo_url: '/brasa/365a2f7b9a.png',
      is_available: true,
    })
    expect(dishes?.find((dish) => dish.name === 'Calamares Fritos')?.photo_url).toBe('/brasa/calamares-fritos.png')
    expect(dishes?.find((dish) => dish.name === 'Ceviche de Corvina')?.photo_url).toBe('/brasa/ceviche-corvina.png')
    expect(dishes?.find((dish) => dish.name === 'Ojo de Bife a la Leña')?.photo_url).toMatch(/^\/brasa\//)
  })

  it('stores the chosen waiter reason and detail', async () => {
    const diner = await join()
    const { data, error } = await supabase
      .rpc('rpc_create_table_request', {
        p_device_token: diner.device_token,
        p_type: 'llamar_mesero',
        p_reason: 'Cubiertos / vajilla',
        p_notes: 'Dos tenedores extra, por favor',
      })
      .single()

    expect(error).toBeNull()
    expect(data).toMatchObject({
      reason: 'Cubiertos / vajilla',
      notes: 'Dos tenedores extra, por favor',
      status: 'pending',
    })
  })

  it('stores kitchen notes and retrieves the submitted round for the diner', async () => {
    const diner = await join()
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', 'sabor-brasa')
      .single()
    const { data: dish } = await supabase
      .from('dishes')
      .select('id')
      .eq('restaurant_id', restaurant!.id)
      .eq('is_available', true)
      .limit(1)
      .single()
    expect(dish).toBeTruthy()

    const { error: cartError } = await supabase.rpc('rpc_add_cart_item', {
      p_device_token: diner.device_token,
      p_dish_id: dish!.id,
      p_quantity: 2,
      p_notes: 'Término medio',
    })
    expect(cartError).toBeNull()

    const { data: round, error: submitError } = await supabase
      .rpc('rpc_submit_order_round', {
        p_device_token: diner.device_token,
        p_kitchen_notes: 'Alergia a los frutos secos',
      })
      .single()
    expect(submitError).toBeNull()
    expect(round).toMatchObject({ notes: 'Alergia a los frutos secos' })

    const { data: latest, error: latestError } = await supabase.rpc('rpc_get_latest_order', {
      p_device_token: diner.device_token,
    })
    expect(latestError).toBeNull()
    expect(latest.some((item: { cart_item_id: string; dish_id: string; quantity: number }) => item.cart_item_id && item.dish_id === dish!.id && item.quantity === 2)).toBe(true)
    expect(latest[0]).toMatchObject({
      round_id: (round as { id: string }).id,
      kitchen_notes: 'Alergia a los frutos secos',
    })
  })
})
