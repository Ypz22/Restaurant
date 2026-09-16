import { createClient } from '@/lib/supabase/client'

export type TableAvailability = 'available' | 'reserved' | 'unavailable'
export type TableStatus = 'occupied' | TableAvailability

export type AdminTable = {
  id: string
  label: string
  qrToken: string
  availability: TableAvailability
  session: { id: string; openedAt: string } | null
}

/** Una sesión abierta manda sobre la marca manual del staff. */
export function tableStatus(table: Pick<AdminTable, 'availability' | 'session'>): TableStatus {
  return table.session ? 'occupied' : table.availability
}

const TABLE_ERRORS: Record<string, string> = {
  invalid_label: 'Escribe un nombre de hasta 40 caracteres.',
  label_taken: 'Ya existe una mesa con ese nombre.',
  table_occupied: 'La mesa está ocupada. Ciérrala primero.',
  table_has_history: 'La mesa tiene pedidos registrados. Márcala como No disponible en lugar de eliminarla.',
  table_not_found: 'La mesa ya no existe.',
}

function tableError(message: string) {
  const code = Object.keys(TABLE_ERRORS).find((key) => message.includes(key))
  return new Error(code ? TABLE_ERRORS[code] : 'No se pudo completar la acción. Intenta de nuevo.')
}

type TableRow = { id: string; label: string; qr_token: string; availability: TableAvailability }

function toTable(row: TableRow, session: AdminTable['session'] = null): AdminTable {
  return { id: row.id, label: row.label, qrToken: row.qr_token, availability: row.availability, session }
}

export type PendingRequest = {
  id: string
  tableId: string
  tableLabel: string
  type: 'llamar_mesero' | 'agua'
  reason: string
  notes: string
  createdAt: string
}

export function requestLabel(request: Pick<PendingRequest, 'type' | 'reason'>) {
  return request.reason || (request.type === 'agua' ? 'Pide agua' : 'Llamando mesero')
}

export async function getTablesWithSessions(restaurantId: string): Promise<AdminTable[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rpc_admin_get_tables', { p_restaurant_id: restaurantId })
  if (error) throw new Error(error.message)

  type Row = TableRow & { session_id: string | null; opened_at: string | null }
  return ((data ?? []) as Row[]).map((row) =>
    toTable(row, row.session_id && row.opened_at ? { id: row.session_id, openedAt: row.opened_at } : null)
  )
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

  type Row = { id: string; table_id: string; table_label: string; type: 'llamar_mesero' | 'agua'; reason: string; notes: string; created_at: string }
  return ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    tableId: row.table_id,
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

async function tableRpc(fn: string, args: Record<string, unknown>): Promise<AdminTable> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc(fn, args).single()
  if (error) throw tableError(error.message)
  return toTable(data as TableRow)
}

export function createTable(restaurantId: string, label: string) {
  return tableRpc('rpc_admin_create_table', { p_restaurant_id: restaurantId, p_label: label })
}

export function renameTable(restaurantId: string, tableId: string, label: string) {
  return tableRpc('rpc_admin_rename_table', { p_restaurant_id: restaurantId, p_table_id: tableId, p_label: label })
}

export function setTableAvailability(restaurantId: string, tableId: string, availability: TableAvailability) {
  return tableRpc('rpc_admin_set_table_availability', {
    p_restaurant_id: restaurantId, p_table_id: tableId, p_availability: availability,
  })
}

export function regenerateTableQr(restaurantId: string, tableId: string) {
  return tableRpc('rpc_admin_regenerate_table_qr', { p_restaurant_id: restaurantId, p_table_id: tableId })
}

export async function deleteTable(restaurantId: string, tableId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rpc_admin_delete_table', { p_restaurant_id: restaurantId, p_table_id: tableId })
  if (error) throw tableError(error.message)
}
