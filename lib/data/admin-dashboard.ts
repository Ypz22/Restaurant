import { createClient } from '@/lib/supabase/client'

export type SalesPeriod = 'day' | 'week' | 'month' | 'year'

export type SalesReport = {
  kpis: {
    revenue: number
    prevRevenue: number
    orders: number
    prevOrders: number
    avgTicket: number
    prevAvgTicket: number
    avgTableMinutes: number
    prevAvgTableMinutes: number
    openTables: number
  }
  series: { bucket: string; revenue: number; prevRevenue: number }[]
  byCategory: { category: string; revenue: number }[]
  topDishes: { dish: string; quantity: number; revenue: number }[]
  tables: { table: string; sessions: number; revenue: number; avgMinutes: number }[]
}

type RawReport = {
  kpis: Record<string, number | string>
  series: { bucket: string; revenue: number | string; prev_revenue: number | string }[]
  by_category: { category: string; revenue: number | string }[]
  top_dishes: { dish: string; quantity: number | string; revenue: number | string }[]
  tables: { table: string; sessions: number | string; revenue: number | string; avg_minutes: number | string }[]
}

export async function getSalesReport(restaurantId: string, period: SalesPeriod): Promise<SalesReport> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rpc_admin_get_sales_report', {
    p_restaurant_id: restaurantId,
    p_period: period,
  })
  if (error) throw new Error(error.message)

  const raw = data as RawReport
  const k = raw.kpis
  return {
    kpis: {
      revenue: Number(k.revenue),
      prevRevenue: Number(k.prev_revenue),
      orders: Number(k.orders),
      prevOrders: Number(k.prev_orders),
      avgTicket: Number(k.avg_ticket),
      prevAvgTicket: Number(k.prev_avg_ticket),
      avgTableMinutes: Number(k.avg_table_minutes),
      prevAvgTableMinutes: Number(k.prev_avg_table_minutes),
      openTables: Number(k.open_tables),
    },
    series: raw.series.map((s) => ({ bucket: s.bucket, revenue: Number(s.revenue), prevRevenue: Number(s.prev_revenue) })),
    byCategory: raw.by_category.map((c) => ({ category: c.category, revenue: Number(c.revenue) })),
    topDishes: raw.top_dishes.map((d) => ({ dish: d.dish, quantity: Number(d.quantity), revenue: Number(d.revenue) })),
    tables: raw.tables.map((t) => ({
      table: t.table,
      sessions: Number(t.sessions),
      revenue: Number(t.revenue),
      avgMinutes: Number(t.avg_minutes),
    })),
  }
}
