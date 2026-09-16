import { createClient } from '@/lib/supabase/client'

export type OrderRoundStatus = 'pending' | 'preparing' | 'ready' | 'delivered'

export type KitchenTicketItem = {
  id: string
  dishName: string
  quantity: number
  notes: string
}

export type KitchenTicket = {
  roundId: string
  tableLabel: string
  submittedAt: string
  status: OrderRoundStatus
  kitchenNotes: string
  items: KitchenTicketItem[]
}

const NEXT_STATUS: Record<OrderRoundStatus, OrderRoundStatus | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: null,
}

export function nextStatus(status: OrderRoundStatus): OrderRoundStatus | null {
  return NEXT_STATUS[status]
}

export async function getActiveTickets(restaurantId: string): Promise<KitchenTicket[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rpc_admin_get_active_tickets', { p_restaurant_id: restaurantId })
  if (error) throw new Error(error.message)

  const ticketsByRound = new Map<string, KitchenTicket>()
  for (const row of data ?? []) {
    let ticket = ticketsByRound.get(row.round_id)
    if (!ticket) {
      ticket = {
        roundId: row.round_id,
        tableLabel: row.table_label,
        submittedAt: row.submitted_at,
        status: row.status,
        kitchenNotes: row.kitchen_notes,
        items: [],
      }
      ticketsByRound.set(row.round_id, ticket)
    }
    if (row.item_id) {
      ticket.items.push({ id: row.item_id, dishName: row.dish_name, quantity: row.quantity, notes: row.item_notes })
    }
  }

  return Array.from(ticketsByRound.values())
}

export async function advanceOrderRound(
  restaurantId: string,
  roundId: string,
  nextStatusValue: OrderRoundStatus
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rpc_admin_advance_order_round', {
    p_restaurant_id: restaurantId,
    p_round_id: roundId,
    p_next_status: nextStatusValue,
  })
  if (error) throw new Error(error.message)
}
