import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createTableRequest } from '@/lib/data/requests'
import { startSession } from '@/lib/data/session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let deviceToken: string
let tableSessionId: string

beforeAll(async () => {
  const { data: restaurant } = await admin
    .from('restaurants').insert({ name: 'T', slug: 'req-' + Date.now() }).select().single()
  const { data: table } = await admin
    .from('tables').insert({ restaurant_id: restaurant!.id, label: 'T1' }).select().single()
  const session = await startSession(table!.qr_token, 'Ana')
  deviceToken = session.deviceToken
  tableSessionId = session.tableSessionId
})

describe('createTableRequest', () => {
  it('creates a pending llamar_mesero request', async () => {
    const req = await createTableRequest(deviceToken, 'llamar_mesero')
    expect(req.status).toBe('pending')
    expect(req.type).toBe('llamar_mesero')
  })

  it('does not create a duplicate pending request of the same type', async () => {
    const first = await createTableRequest(deviceToken, 'agua')
    const second = await createTableRequest(deviceToken, 'agua')
    expect(second.id).toBe(first.id)

    const { data: rows } = await admin
      .from('table_requests')
      .select('id')
      .eq('table_session_id', tableSessionId)
      .eq('type', 'agua')
    expect(rows).toHaveLength(1)
  })
})
