'use client'

import { useRef, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ConciergeBell, CheckCheck, ChefHat, Timer, WifiOff } from 'lucide-react'
import { useAdminRestaurant } from '@/components/admin/restaurant-context'
import {
  getActiveTickets, getDeliveredTickets, advanceOrderRound, setItemPrepared, summarizePending,
  type KitchenTicket, type OrderRoundStatus, type PendingDish,
} from '@/lib/data/admin-kitchen'
import { usePolling } from '@/hooks/use-polling'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const KDS_WARN_MINUTES = 10
const KDS_LATE_MINUTES = 20

const STATUS_BADGE: Record<OrderRoundStatus, { label: string; variant: 'muted' | 'warning' | 'success' }> = {
  pending: { label: 'Nueva', variant: 'muted' },
  preparing: { label: 'En preparación', variant: 'warning' },
  ready: { label: 'Lista', variant: 'success' },
  delivered: { label: 'Entregada', variant: 'muted' },
}

type Filter = 'all' | OrderRoundStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Nuevas' },
  { value: 'preparing', label: 'En preparación' },
  { value: 'ready', label: 'Listas' },
  { value: 'delivered', label: 'Entregados' },
]

function elapsed(iso: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  const minutes = Math.floor(seconds / 60)
  return { minutes, label: `${minutes}:${String(seconds % 60).padStart(2, '0')}` }
}

function PendingList({ dishes }: { dishes: PendingDish[] }) {
  if (dishes.length === 0) {
    return <p className="py-4 text-center text-body-md text-muted-foreground">Nada pendiente</p>
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {dishes.map((dish) => (
        <li key={dish.dishName} className="flex items-start gap-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning-soft text-label-lg tabular-nums text-warning-soft-foreground">{dish.quantity}</span>
          <div className="min-w-0">
            <p className="text-body-md font-medium text-foreground">{dish.dishName}</p>
            <p className="text-label-md tabular-nums text-muted-foreground">
              {dish.tables.map((t) => `${t.label} ×${t.quantity}`).join(' · ')}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Ticket({
  ticket, now, onToggle, onAdvance,
}: {
  ticket: KitchenTicket
  now: number
  onToggle: (ticket: KitchenTicket, itemId: string, prepared: boolean) => void
  onAdvance: (ticket: KitchenTicket) => void
}) {
  const badge = STATUS_BADGE[ticket.status]
  const time = elapsed(ticket.submittedAt, now)
  const done = ticket.items.filter((i) => i.preparedAt).length
  const total = ticket.items.length
  const allDone = done === total
  const locked = ticket.status === 'ready' || ticket.status === 'delivered'

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-muted px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-title-md text-foreground">{ticket.tableLabel}</h2>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 text-label-lg tabular-nums',
            time.minutes >= KDS_LATE_MINUTES ? 'text-destructive'
              : time.minutes >= KDS_WARN_MINUTES ? 'text-warning-soft-foreground'
                : 'text-muted-foreground'
          )}
        >
          <Timer className="size-4" />
          {time.label}
        </span>
      </header>

      <ul className="flex flex-col divide-y divide-border px-2">
        {ticket.items.map((item) => (
          <li key={item.id}>
            <label className={cn('flex min-h-11 items-start gap-3 rounded-xl px-2 py-2.5', !locked && 'cursor-pointer hover:bg-muted/50')}>
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 accent-primary"
                checked={!!item.preparedAt}
                disabled={locked}
                onChange={(e) => onToggle(ticket, item.id, e.target.checked)}
              />
              <span className="min-w-0">
                <span className={cn('block text-body-md text-foreground', item.preparedAt && 'text-muted-foreground line-through')}>
                  <span className="font-semibold tabular-nums">{item.quantity}×</span> {item.dishName}
                </span>
                {item.notes && <span className="block text-label-md text-muted-foreground">{item.notes}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {ticket.kitchenNotes && (
        <p className="mx-4 mb-2 border-l-4 border-warning-soft-foreground/40 bg-warning-soft px-3 py-1.5 text-label-md text-warning-soft-foreground">
          {ticket.kitchenNotes}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2 px-4 pt-1 pb-4">
        {total > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <span className="text-label-md tabular-nums text-muted-foreground">{done} de {total}</span>
          </div>
        )}
        {ticket.status === 'delivered' ? (
          <span className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-success-soft text-label-lg text-success-soft-foreground">
            <CheckCheck className="size-4" /> Entregada
          </span>
        ) : locked ? (
          <Button variant="secondary" className="w-full" onClick={() => onAdvance(ticket)}>
            <CheckCheck /> Marcar como entregada
          </Button>
        ) : (
          <Button className="w-full" disabled={!allDone} onClick={() => onAdvance(ticket)}>
            Todo listo
          </Button>
        )}
      </div>
    </article>
  )
}

export default function KitchenPage() {
  const restaurant = useAdminRestaurant()
  const [tickets, setTickets] = useState<KitchenTicket[]>([])
  const [delivered, setDelivered] = useState<KitchenTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [offline, setOffline] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [now, setNow] = useState(() => Date.now())
  const loaded = useRef(false)
  const mutations = useRef({ inFlight: 0, lastEndedAt: 0 })

  usePolling(load, undefined, restaurant.id)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [])

  async function load() {
    const startedAt = Date.now()
    try {
      const [active, deliveredTickets] = await Promise.all([getActiveTickets(restaurant.id), getDeliveredTickets(restaurant.id)])
      // No pisar un cambio optimista que la consulta todavía no refleja.
      const m = mutations.current
      if (m.inFlight > 0 || startedAt < m.lastEndedAt) return
      setTickets(active)
      setDelivered(deliveredTickets)
      loaded.current = true
      setError(false)
      setOffline(false)
    } catch {
      if (loaded.current) setOffline(true)
      else setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function mutate(optimistic: (current: KitchenTicket[]) => KitchenTicket[], run: () => Promise<unknown>, message: string) {
    const snapshot = tickets
    mutations.current.inFlight++
    setTickets(optimistic)
    try {
      await run()
    } catch {
      toast.error(message)
      setTickets(snapshot)
    } finally {
      mutations.current.inFlight--
      mutations.current.lastEndedAt = Date.now()
    }
  }

  function handleToggle(ticket: KitchenTicket, itemId: string, prepared: boolean) {
    void mutate(
      (current) => current.map((t) => t.roundId !== ticket.roundId ? t : {
        ...t,
        status: prepared && t.status === 'pending' ? 'preparing' : t.status,
        items: t.items.map((i) => (i.id === itemId ? { ...i, preparedAt: prepared ? new Date().toISOString() : null } : i)),
      }),
      () => setItemPrepared(restaurant.id, itemId, prepared),
      'No se pudo actualizar el plato. Intenta de nuevo.'
    )
  }

  function handleAdvance(ticket: KitchenTicket) {
    const next: OrderRoundStatus = ticket.status === 'ready' ? 'delivered' : 'ready'
    void mutate(
      (current) => next === 'delivered'
        ? current.filter((t) => t.roundId !== ticket.roundId)
        : current.map((t) => (t.roundId === ticket.roundId ? { ...t, status: next } : t)),
      async () => {
        // Una comanda sin platos marcados sigue en pending: pasa por preparing antes de ready.
        if (ticket.status === 'pending') await advanceOrderRound(restaurant.id, ticket.roundId, 'preparing')
        await advanceOrderRound(restaurant.id, ticket.roundId, next)
        if (next === 'delivered') setDelivered((current) => [{ ...ticket, status: 'delivered' }, ...current])
      },
      'No se pudo avanzar la comanda. Intenta de nuevo.'
    )
  }

  if (loading) {
    return (
      <div className="flex gap-4">
        <Skeleton className="hidden h-96 w-72 shrink-0 lg:block" />
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-danger-soft p-6 text-danger-soft-foreground">
        No se pudo conectar con la cocina. <Button variant="ghost" size="sm" onClick={load}>Reintentar</Button>
      </div>
    )
  }

  const pending = summarizePending(tickets)
  const counts = {
    all: tickets.length,
    pending: tickets.filter((t) => t.status === 'pending').length,
    preparing: tickets.filter((t) => t.status === 'preparing').length,
    ready: tickets.filter((t) => t.status === 'ready').length,
    delivered: delivered.length,
  }
  const visible = filter === 'delivered' ? delivered : filter === 'all' ? tickets : tickets.filter((t) => t.status === filter)
  const pendingTotal = pending.reduce((sum, d) => sum + d.quantity, 0)

  return (
    <div className="flex flex-col gap-4">
      {offline && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-warning-soft px-4 py-2 text-label-md text-warning-soft-foreground">
          <WifiOff className="size-4" /> Sin conexión, reintentando…
        </div>
      )}

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList aria-label="Filtrar comandas">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value} className="gap-1.5">
              {f.label} <span className="tabular-nums opacity-80">{counts[f.value]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <details className="rounded-2xl border border-border bg-card px-4 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-label-lg text-foreground">
          <ChefHat className="size-4" /> Por hacer <span className="tabular-nums text-muted-foreground">{pendingTotal}</span>
        </summary>
        <p className="pb-2 text-label-md text-muted-foreground">Suma de platos sin marcar en las comandas nuevas y en preparación, para priorizar la cocina.</p>
        <PendingList dishes={pending} />
      </details>

      <div className="flex items-start gap-4">
        <aside
          aria-label="Platos por hacer"
          className="sticky top-16 hidden max-h-[calc(100dvh-5rem)] w-72 shrink-0 overflow-y-auto rounded-2xl border border-border bg-card px-4 py-3 shadow-sm lg:block"
        >
          <h2 className="flex items-center gap-2 text-label-lg text-foreground">
            <ChefHat className="size-4" /> Por hacer
            <span className="ml-auto tabular-nums text-muted-foreground">{pendingTotal}</span>
          </h2>
          <p className="pb-1 pt-0.5 text-label-md text-muted-foreground">Suma de platos sin marcar en las comandas nuevas y en preparación, para priorizar la cocina.</p>
          <PendingList dishes={pending} />
        </aside>

        {visible.length === 0 ? (
          <div className="flex flex-1 flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center">
            <ConciergeBell className="size-6 text-muted-foreground" />
            <p className="text-body-md text-muted-foreground">
              {tickets.length === 0 ? 'No hay comandas activas por ahora.' : 'No hay comandas con este estado.'}
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-start gap-4">
            {visible.map((ticket) => (
              <Ticket key={ticket.roundId} ticket={ticket} now={now} onToggle={handleToggle} onAdvance={handleAdvance} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
