import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { startSession, resumeSession } from '@/lib/data/session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let qrToken: string

beforeAll(async () => {
  const { data: restaurant } = await admin
    .from('restaurants')
    .insert({ name: 'Origen Café', slug: 'origen-' + Date.now() })
    .select()
    .single()
  const { data: table } = await admin
    .from('tables')
    .insert({ restaurant_id: restaurant!.id, label: 'Mesa 2' })
    .select()
    .single()
  qrToken = table!.qr_token
})

describe('session RPCs', () => {
  it('starts a session, then two diners share the same table_session_id', async () => {
    const first = await startSession(qrToken, 'Ana')
    const second = await startSession(qrToken, 'Beto')
    expect(second.tableSessionId).toBe(first.tableSessionId)
    expect(second.dinerId).not.toBe(first.dinerId)
  })

  it('resumes a session by device_token', async () => {
    const started = await startSession(qrToken, 'Caro')
    const resumed = await resumeSession(started.deviceToken)
    expect(resumed?.nickname).toBe('Caro')
    expect(resumed?.sessionStatus).toBe('open')
  })

  it('returns null resuming an unknown device_token', async () => {
    const resumed = await resumeSession('00000000-0000-0000-0000-000000000000')
    expect(resumed).toBeNull()
  })
})
