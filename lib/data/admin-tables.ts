import { createClient } from '@/lib/supabase/client'

export type AdminTable = {
  id: string
  label: string
  qrToken: string
  session: { id: string; openedAt: string } | null
}

export type PendingRequest = {
  id: string
  tableLabel: string
  type: 'llamar_mesero' | 'agua'
  reason: string
  notes: string
  createdAt: string
}

export async function getTablesWithSessions(restaurantId: string): Promise<AdminTable[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rpc_admin_get_tables', { p_restaurant_id: restaurantId })
  if (error) throw new Error(error.message)

  type Row = { id: string; label: string; qr_token: string; session_id: string | null; opened_at: string | null }
  return ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    label: row.label,
    qrToken: row.qr_token,
    session: row.session_id && row.opened_at ? { id: row.session_id, openedAt: row.opened_at } : null,
  }))
}

export async function closeTableSession(restaurantId: string, tableSessionId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rpc_admin_close_table_session', {
    p_restaurant_id: restaurantId,
    p_table_session_id: tableSessionId,
  })
  if (error) throw new Error(error.message)
}

export async function getPendingRequests(restaurantId: string): Promise<PendingRequest[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rpc_admin_get_pending_requests', { p_restaurant_id: restaurantId })
  if (error) throw new Error(error.message)

  type Row = { id: string; table_label: string; type: 'llamar_mesero' | 'agua'; reason: string; notes: string; created_at: string }
  return ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    tableLabel: row.table_label,
    type: row.type,
    reason: row.reason,
    notes: row.notes,
    createdAt: row.created_at,
  }))
}

export async function acknowledgeRequest(restaurantId: string, requestId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rpc_admin_acknowledge_table_request', {
    p_restaurant_id: restaurantId,
    p_request_id: requestId,
  })
  if (error) throw new Error(error.message)
}
