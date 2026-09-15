import { createClient } from '@/lib/supabase/client'

export type StartedSession = {
  tableSessionId: string
  dinerId: string
  deviceToken: string
}

export type ResumedSession = {
  tableSessionId: string
  dinerId: string
  nickname: string
  sessionStatus: 'open' | 'closed'
  tableLabel: string
  restaurantName: string
  restaurantSlug: string
}

export async function startSession(qrToken: string, nickname: string): Promise<StartedSession> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_start_session', { p_qr_token: qrToken, p_nickname: nickname })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'start_session_failed')

  const row = data as {
    table_session_id: string
    diner_id: string
    device_token: string
  }

  return {
    tableSessionId: row.table_session_id,
    dinerId: row.diner_id,
    deviceToken: row.device_token,
  }
}

export async function resumeSession(deviceToken: string): Promise<ResumedSession | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_resume_session', { p_device_token: deviceToken })
    .maybeSingle()

  if (error || !data) return null

  const row = data as {
    table_session_id: string
    diner_id: string
    nickname: string
    session_status: 'open' | 'closed'
    table_label: string
    restaurant_name: string
    restaurant_slug: string
  }

  return {
    tableSessionId: row.table_session_id,
    dinerId: row.diner_id,
    nickname: row.nickname,
    sessionStatus: row.session_status,
    tableLabel: row.table_label,
    restaurantName: row.restaurant_name,
    restaurantSlug: row.restaurant_slug,
  }
}
