import { createClient } from '@/lib/supabase/client'

export type SalesSummary = {
  totalRevenue: number
  orderCount: number
  avgTicket: number
  openTables: number
}

export type TopDish = { name: string; quantity: number; revenue: number }

export async function getSalesSummary(restaurantId: string): Promise<SalesSummary> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_admin_get_sales_summary', { p_restaurant_id: restaurantId })
    .single()
  if (error) throw new Error(error.message)

  const row = data as { total_revenue: number; order_count: number; avg_ticket: number; open_tables: number }
  return {
    totalRevenue: Number(row.total_revenue),
    orderCount: Number(row.order_count),
    avgTicket: Number(row.avg_ticket),
    openTables: Number(row.open_tables),
  }
}

export async function getTopDishes(restaurantId: string, limit = 5): Promise<TopDish[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('rpc_admin_get_top_dishes', { p_restaurant_id: restaurantId, p_limit: limit })
  if (error) throw new Error(error.message)

  type Row = { dish_name: string; total_quantity: number; total_revenue: number }
  return ((data ?? []) as Row[]).map((row) => ({
    name: row.dish_name,
    quantity: Number(row.total_quantity),
    revenue: Number(row.total_revenue),
  }))
}
