import { createClient } from '@/lib/supabase/client'

export type TableRequest = {
  id: string
  type: 'llamar_mesero' | 'agua'
  status: 'pending' | 'acknowledged'
  reason: string
  notes: string
}

export async function createTableRequest(
  deviceToken: string,
  type: TableRequest['type'],
  reason = '',
  notes = ''
): Promise<TableRequest> {
  const supabase = createClient()
  const details = reason || notes
  const { data, error } = await supabase
    .rpc('rpc_create_table_request', details
      ? { p_device_token: deviceToken, p_type: type, p_reason: reason, p_notes: notes }
      : { p_device_token: deviceToken, p_type: type })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'create_table_request_failed')

  const row = data as {
    id: string
    type: 'llamar_mesero' | 'agua'
    status: 'pending' | 'acknowledged'
    reason: string
    notes: string
  }

  return { id: row.id, type: row.type, status: row.status, reason: row.reason, notes: row.notes }
}
