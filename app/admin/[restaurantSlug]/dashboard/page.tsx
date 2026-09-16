'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, Pie, PieChart, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  DollarSign, ReceiptText, TrendingUp, TrendingDown, Clock, ChartLine, ChartPie, ChartBar, Armchair, RefreshCw,
} from 'lucide-react'
import { useAdminRestaurant } from '@/components/admin/restaurant-context'
import { getSalesReport, type SalesPeriod, type SalesReport } from '@/lib/data/admin-dashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ChartContainer, ChartLegend, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'

const PERIODS: { param: string; value: SalesPeriod; label: string; previous: string }[] = [
  { param: 'hoy', value: 'day', label: 'Hoy', previous: 'ayer' },
  { param: 'semana', value: 'week', label: 'Semana', previous: '7 días previos' },
  { param: 'mes', value: 'month', label: 'Mes', previous: '30 días previos' },
  { param: 'anio', value: 'year', label: 'Año', previous: '12 meses previos' },
]

const CATEGORY_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-5)', 'var(--chart-4)']
const MAX_CATEGORY_SLICES = 5

const currencyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const compactCurrencyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' })
const currency = (value: number) => currencyFormat.format(value)

// Los buckets vienen en UTC (zona del servidor); se muestran en UTC para no correr el día.
function bucketLabel(iso: string, period: SalesPeriod, long = false) {
  const date = new Date(iso)
  const opts: Intl.DateTimeFormatOptions =
    period === 'day' ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : period === 'year' ? { month: long ? 'long' : 'short', ...(long && { year: 'numeric' }) }
        : { weekday: 'short', day: 'numeric', ...(long && { month: 'short' }) }
  return new Intl.DateTimeFormat('es', { ...opts, timeZone: 'UTC' }).format(date)
}

function EmptyChart({ icon: Icon, className }: { icon: typeof ChartLine; className?: string }) {
  return (
    <div className={cn('flex h-72 flex-col items-center justify-center gap-2 text-center', className)}>
      <Icon className="size-6 text-muted-foreground" />
      <p className="text-body-md text-muted-foreground">Sin ventas en este periodo</p>
    </div>
  )
}

function Panel({ title, icon: Icon, className, children, aside }: {
  title: string; icon: typeof ChartLine; className?: string; children: React.ReactNode; aside?: React.ReactNode
}) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm', className)}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-title-md text-foreground">
          <Icon className="size-4 text-muted-foreground" /> {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  )
}

function KpiCard({
  icon: Icon, label, value, current, previous, previousLabel, neutral = false, emptyNote,
}: {
  icon: typeof DollarSign; label: string; value: string; current: number; previous: number; previousLabel: string
  neutral?: boolean; emptyNote?: string
}) {
  const change = previous === 0 ? null : ((current - previous) / previous) * 100
  const up = change !== null && change >= 0
  const Trend = up ? TrendingUp : TrendingDown

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-label-md text-muted-foreground">{label}</p>
        <span className="rounded-xl bg-secondary p-2 text-secondary-foreground"><Icon className="size-4" /></span>
      </div>
      <p className="text-headline-md tabular-nums text-foreground">{value}</p>
      {emptyNote ? (
        <p className="text-label-md text-muted-foreground">{emptyNote}</p>
      ) : change === null ? (
        <p className="text-label-md text-muted-foreground">Sin datos de {previousLabel}</p>
      ) : (
        <p className="flex flex-wrap items-center gap-1.5 text-label-md text-muted-foreground">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 tabular-nums',
              neutral ? 'bg-muted text-muted-foreground'
                : up ? 'bg-success-soft text-success-soft-foreground' : 'bg-danger-soft text-danger-soft-foreground'
            )}
          >
            <Trend className="size-3.5" />
            {up ? '+' : ''}{change.toFixed(1)}%
          </span>
          vs. {previousLabel}
        </p>
      )}
    </div>
  )
}

function DashboardContent() {
  const restaurant = useAdminRestaurant()
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const periodInfo = PERIODS.find((p) => p.param === search.get('periodo')) ?? PERIODS[0]
  const period = periodInfo.value

  const [report, setReport] = useState<{ period: SalesPeriod; data: SalesReport } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let active = true
    getSalesReport(restaurant.id, period)
      .then((data) => { if (active) { setReport({ period, data }); setError(false) } })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [restaurant.id, period, reloadTick])

  function startLoading() {
    setLoading(true)
    setError(false)
  }

  function changePeriod(param: string) {
    if (param === periodInfo.param) return
    startLoading()
    const next = new URLSearchParams(search)
    next.set('periodo', param)
    router.replace(`${pathname}?${next}`, { scroll: false })
  }

  function refresh() {
    startLoading()
    setReloadTick((n) => n + 1)
  }

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-headline-lg text-foreground">Ventas</h1>
        <p className="text-body-md text-muted-foreground">Rendimiento comparado con {periodInfo.previous}</p>
      </div>
      <div className="flex items-center gap-2">
        <Tabs value={periodInfo.param} onValueChange={changePeriod}>
          <TabsList aria-label="Periodo" className="rounded-full bg-card p-1 border border-border">
            {PERIODS.map((p) => <TabsTrigger key={p.param} value={p.param}>{p.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Button variant="ghost" size="icon" aria-label="Actualizar" title="Actualizar" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn(loading && 'animate-spin')} />
        </Button>
      </div>
    </div>
  )

  if (!report) {
    if (error) {
      return (
        <div className="flex flex-col gap-5">
          {header}
          <div className="rounded-2xl bg-danger-soft p-6 text-danger-soft-foreground">
            No se pudo cargar el dashboard. <Button variant="ghost" size="sm" onClick={refresh}>Reintentar</Button>
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 w-full lg:col-span-2" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  const { data } = report
  const shownPeriod = report.period
  const k = data.kpis
  const hasSales = k.revenue > 0

  const seriesConfig: ChartConfig = {
    revenue: { label: 'Actual', color: 'var(--chart-1)' },
    prevRevenue: { label: 'Anterior', color: 'var(--chart-4)' },
  }

  const categories = data.byCategory.length > MAX_CATEGORY_SLICES
    ? [
      ...data.byCategory.slice(0, MAX_CATEGORY_SLICES - 1),
      { category: 'Otras', revenue: data.byCategory.slice(MAX_CATEGORY_SLICES - 1).reduce((s, c) => s + c.revenue, 0) },
    ]
    : data.byCategory
  const categoryTotal = categories.reduce((s, c) => s + c.revenue, 0)
  const categoryConfig: ChartConfig = Object.fromEntries(
    categories.map((c, i) => [`cat${i}`, { label: c.category, color: CATEGORY_COLORS[i] }])
  )
  const dishesConfig: ChartConfig = { quantity: { label: 'Unidades', color: 'var(--chart-1)' } }

  return (
    <div className="flex flex-col gap-5">
      {header}
      {error && (
        <div className="rounded-xl bg-danger-soft px-4 py-2 text-label-md text-danger-soft-foreground">
          No se pudo actualizar. Mostrando el último reporte cargado.
        </div>
      )}

      <div className={cn('flex flex-col gap-4 transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <KpiCard icon={DollarSign} label="Ventas" value={currency(k.revenue)} current={k.revenue} previous={k.prevRevenue} previousLabel={periodInfo.previous} />
          <KpiCard icon={ReceiptText} label="Pedidos" value={String(k.orders)} current={k.orders} previous={k.prevOrders} previousLabel={periodInfo.previous} />
          <KpiCard icon={TrendingUp} label="Ticket promedio" value={currency(k.avgTicket)} current={k.avgTicket} previous={k.prevAvgTicket} previousLabel={periodInfo.previous} />
          <KpiCard
            icon={Clock} label="Tiempo de mesa promedio" value={k.avgTableMinutes > 0 ? `${Math.round(k.avgTableMinutes)} min` : '—'}
            emptyNote={k.avgTableMinutes > 0 ? undefined : 'Sin mesas cerradas en el periodo'}
            current={k.avgTableMinutes} previous={k.prevAvgTableMinutes} previousLabel={periodInfo.previous} neutral
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Ventas en el tiempo" icon={ChartLine} className="lg:col-span-2" aside={<ChartLegend config={seriesConfig} />}>
            {hasSales || k.prevRevenue > 0 ? (
              <ChartContainer config={seriesConfig}>
                <AreaChart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="bucket" tickLine={false} axisLine={false} minTickGap={24}
                    tickFormatter={(v: string) => bucketLabel(v, shownPeriod)}
                  />
                  <YAxis
                    width={56} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => compactCurrencyFormat.format(v)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <ChartTooltipContent
                        active={active} payload={payload} label={label} config={seriesConfig} formatValue={currency}
                        formatLabel={(l) => bucketLabel(String(l), shownPeriod, true)}
                      />
                    )}
                  />
                  <Line
                    dataKey="prevRevenue" type="monotone" stroke="var(--color-prevRevenue)" strokeWidth={2}
                    strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false}
                  />
                  <Area
                    dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2}
                    fill="var(--color-revenue)" fillOpacity={0.12} isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <EmptyChart icon={ChartLine} />
            )}
          </Panel>

          <Panel title="Por categoría" icon={ChartPie}>
            {categories.length > 0 ? (
              <>
                <div className="relative">
                  <ChartContainer config={categoryConfig} className="h-52">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => (
                          <ChartTooltipContent
                            active={active} config={categoryConfig} formatValue={currency}
                            payload={payload?.map((p) => ({ ...p, dataKey: `cat${categories.findIndex((c) => c.category === p.name)}` }))}
                          />
                        )}
                      />
                      <Pie data={categories} dataKey="revenue" nameKey="category" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none" isAnimationActive={false}>
                        {categories.map((c, i) => <Cell key={c.category} fill={CATEGORY_COLORS[i]} />)}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-label-sm uppercase text-muted-foreground">Total</span>
                    <span className="text-title-md tabular-nums text-foreground">{compactCurrencyFormat.format(categoryTotal)}</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-2">
                  {categories.map((c, i) => (
                    <li key={c.category} className="flex items-center gap-2 text-body-md">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[i] }} />
                      <span className="min-w-0 flex-1 truncate text-foreground">{c.category}</span>
                      <span className="tabular-nums text-muted-foreground">{((c.revenue / categoryTotal) * 100).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyChart icon={ChartPie} />
            )}
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Platos más vendidos" icon={ChartBar}>
            {data.topDishes.length > 0 ? (
              <ChartContainer config={dishesConfig}>
                <BarChart data={data.topDishes} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category" dataKey="dish" width={180} tickLine={false} axisLine={false}
                    tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <ChartTooltipContent
                        active={active} payload={payload} label={label} config={dishesConfig}
                        formatValue={(v) => String(v)}
                        formatLabel={(l, p) => `${String(l)} · ${currency(Number(p[0]?.payload?.revenue ?? 0))}`}
                      />
                    )}
                  />
                  <Bar dataKey="quantity" fill="var(--color-quantity)" radius={[0, 8, 8, 0]} barSize={24} isAnimationActive={false} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChart icon={ChartBar} />
            )}
          </Panel>

          <Panel
            title="Rendimiento de mesas" icon={Armchair}
            aside={<span className="text-label-md tabular-nums text-muted-foreground">{k.openTables} abiertas ahora</span>}
          >
            {data.tables.length > 0 ? (
              <div className="-mx-5 max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Mesa</TableHead>
                      <TableHead className="text-right">Sesiones</TableHead>
                      <TableHead className="text-right">Facturado</TableHead>
                      <TableHead className="pr-5 text-right">Permanencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tables.map((t) => (
                      <TableRow key={t.table}>
                        <TableCell className="pl-5 text-body-md font-medium text-foreground">{t.table}</TableCell>
                        <TableCell className="text-right tabular-nums">{t.sessions}</TableCell>
                        <TableCell className="text-right tabular-nums">{currency(t.revenue)}</TableCell>
                        <TableCell className="pr-5 text-right tabular-nums">{t.avgMinutes} min</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyChart icon={Armchair} />
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <DashboardContent />
    </Suspense>
  )
}
