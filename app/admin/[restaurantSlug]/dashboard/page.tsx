'use client'

import { useEffect, useState } from 'react'
import { DollarSign, ReceiptText, Armchair, TrendingUp, ChartLine } from 'lucide-react'
import { useAdminRestaurant } from '@/components/admin/restaurant-context'
import { getSalesSummary, getTopDishes, type SalesSummary, type TopDish } from '@/lib/data/admin-dashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

const currency = (value: number) => `$${value.toFixed(2)}`

function KpiCard({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="rounded-xl bg-secondary p-2 text-secondary-foreground">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-label-md text-muted-foreground">{label}</p>
        <p className="text-title-lg tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const restaurant = useAdminRestaurant()
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [topDishes, setTopDishes] = useState<TopDish[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => { void load() }, [restaurant.id])

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const [summaryData, topDishesData] = await Promise.all([
        getSalesSummary(restaurant.id),
        getTopDishes(restaurant.id),
      ])
      setSummary(summaryData)
      setTopDishes(topDishesData)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="rounded-2xl bg-danger-soft p-6 text-danger-soft-foreground">
        No se pudo cargar el dashboard. <Button variant="ghost" size="sm" onClick={load}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-title-lg text-foreground">Ventas</h1>
        <p className="text-label-md text-muted-foreground">Resumen de hoy</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <KpiCard icon={DollarSign} label="Ventas totales" value={currency(summary.totalRevenue)} />
        <KpiCard icon={ReceiptText} label="Pedidos" value={String(summary.orderCount)} />
        <KpiCard icon={TrendingUp} label="Ticket promedio" value={currency(summary.avgTicket)} />
        <KpiCard icon={Armchair} label="Mesas abiertas" value={String(summary.openTables)} />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ChartLine className="size-4 text-muted-foreground" />
          <h2 className="text-label-lg text-foreground">Platos más vendidos hoy</h2>
        </div>
        {topDishes.length === 0 ? (
          <p className="p-6 text-center text-body-md text-muted-foreground">Todavía no hay pedidos hoy.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plato</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topDishes.map((dish) => (
                <TableRow key={dish.name}>
                  <TableCell className="text-body-md font-medium text-foreground">{dish.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{dish.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{currency(dish.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
