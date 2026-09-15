import { createClient } from '@/lib/supabase/client'

export type TableRequest = {
  id: string
  type: 'llamar_mesero' | 'agua'
  status: 'pending' | 'acknowledged'
}

export async function createTableRequest(
  deviceToken: string,
  type: TableRequest['type']
): Promise<TableRequest> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_create_table_request', { p_device_token: deviceToken, p_type: type })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'create_table_request_failed')

  const row = data as {
    id: string
    type: 'llamar_mesero' | 'agua'
    status: 'pending' | 'acknowledged'
  }

  return { id: row.id, type: row.type, status: row.status }
}
