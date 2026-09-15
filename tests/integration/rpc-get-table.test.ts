import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getTableByQrToken } from '@/lib/data/table'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let qrToken: string

beforeAll(async () => {
  const { data: restaurant } = await admin
    .from('restaurants')
    .insert({ name: 'Sabor & Brasa', slug: 'sabor-brasa-' + Date.now() })
    .select()
    .single()
  const { data: table } = await admin
    .from('tables')
    .insert({ restaurant_id: restaurant!.id, label: 'Mesa 5' })
    .select()
    .single()
  qrToken = table!.qr_token
})

describe('getTableByQrToken', () => {
  it('returns table and restaurant info for a valid qr_token', async () => {
    const result = await getTableByQrToken(qrToken)
    expect(result?.tableLabel).toBe('Mesa 5')
    expect(result?.restaurantName).toBe('Sabor & Brasa')
  })

  it('returns null for an unknown qr_token', async () => {
    const result = await getTableByQrToken('00000000-0000-0000-0000-000000000000')
    expect(result).toBeNull()
  })
})
