import { createClient } from '@/lib/supabase/client'

export type OrderRoundStatus = 'pending' | 'preparing' | 'ready' | 'delivered'

export type KitchenTicketItem = {
  id: string
  dishName: string
  quantity: number
  notes: string
  preparedAt: string | null
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
      ticket.items.push({
        id: row.item_id,
        dishName: row.dish_name,
        quantity: row.quantity,
        notes: row.item_notes,
        preparedAt: row.prepared_at,
      })
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

export async function setItemPrepared(
  restaurantId: string,
  itemId: string,
  prepared: boolean
): Promise<OrderRoundStatus> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rpc_admin_set_item_prepared', {
    p_restaurant_id: restaurantId,
    p_item_id: itemId,
    p_prepared: prepared,
  })
  if (error) throw new Error(error.message)
  return data as OrderRoundStatus
}

export type PendingDish = {
  dishName: string
  quantity: number
  tables: { label: string; quantity: number }[]
}

/** Suma lo que falta cocinar (ítems sin marcar de comandas nuevas o en preparación), agrupado por plato. */
export function summarizePending(tickets: KitchenTicket[]): PendingDish[] {
  const byDish = new Map<string, PendingDish>()
  for (const ticket of tickets) {
    if (ticket.status !== 'pending' && ticket.status !== 'preparing') continue
    for (const item of ticket.items) {
      if (item.preparedAt) continue
      let dish = byDish.get(item.dishName)
      if (!dish) {
        dish = { dishName: item.dishName, quantity: 0, tables: [] }
        byDish.set(item.dishName, dish)
      }
      dish.quantity += item.quantity
      const table = dish.tables.find((t) => t.label === ticket.tableLabel)
      if (table) table.quantity += item.quantity
      else dish.tables.push({ label: ticket.tableLabel, quantity: item.quantity })
    }
  }
  return Array.from(byDish.values()).sort(
    (a, b) => b.quantity - a.quantity || a.dishName.localeCompare(b.dishName, 'es')
  )
}
