import { createClient } from '@/lib/supabase/client'

export type OrderRound = {
  id: string
  tableSessionId: string
  submittedAt: string
  status: 'pending' | 'preparing' | 'ready' | 'delivered'
  notes: string
}

export async function submitOrderRound(deviceToken: string, kitchenNotes = ''): Promise<OrderRound> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_submit_order_round', kitchenNotes
      ? { p_device_token: deviceToken, p_kitchen_notes: kitchenNotes }
      : { p_device_token: deviceToken })
    .single()

  if (error || !data) throw new Error(error?.message ?? 'submit_order_round_failed')

  const row = data as {
    id: string
    table_session_id: string
    submitted_at: string
    status: 'pending' | 'preparing' | 'ready' | 'delivered'
    notes: string
  }

  return {
    id: row.id,
    tableSessionId: row.table_session_id,
    submittedAt: row.submitted_at,
    status: row.status,
    notes: row.notes,
  }
}
