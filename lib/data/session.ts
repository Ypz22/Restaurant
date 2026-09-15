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

  return {
    tableSessionId: data.table_session_id,
    dinerId: data.diner_id,
    deviceToken: data.device_token,
  }
}

export async function resumeSession(deviceToken: string): Promise<ResumedSession | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_resume_session', { p_device_token: deviceToken })
    .maybeSingle()

  if (error || !data) return null

  return {
    tableSessionId: data.table_session_id,
    dinerId: data.diner_id,
    nickname: data.nickname,
    sessionStatus: data.session_status,
    tableLabel: data.table_label,
    restaurantName: data.restaurant_name,
    restaurantSlug: data.restaurant_slug,
  }
}
