'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ConciergeBell } from 'lucide-react'
import { useAdminRestaurant } from '@/components/admin/restaurant-context'
import {
  getActiveTickets, advanceOrderRound, nextStatus, type KitchenTicket, type OrderRoundStatus,
} from '@/lib/data/admin-kitchen'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const STATUS_BADGE: Record<OrderRoundStatus, { label: string; variant: 'muted' | 'warning' | 'success' }> = {
  pending: { label: 'Nuevo', variant: 'muted' },
  preparing: { label: 'En preparación', variant: 'warning' },
  ready: { label: 'Listo', variant: 'success' },
  delivered: { label: 'Entregado', variant: 'muted' },
}

const ADVANCE_LABEL: Record<string, string> = {
  preparing: 'Empezar',
  ready: 'Listo',
  delivered: 'Entregado',
}

function elapsedLabel(iso: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

export default function AdminKitchenPage() {
  const restaurant = useAdminRestaurant()
  const [tickets, setTickets] = useState<KitchenTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => { void load() }, [restaurant.id])
  useEffect(() => {
    const id = setInterval(load, 5_000)
    return () => clearInterval(id)
  }, [restaurant.id])
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [])

  async function load() {
    try {
      const active = await getActiveTickets(restaurant.id)
      setTickets(active)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdvance(ticket: KitchenTicket) {
    const next = nextStatus(ticket.status)
    if (!next) return
    const previous = ticket.status
    setTickets((current) =>
      next === 'delivered'
        ? current.filter((t) => t.roundId !== ticket.roundId)
        : current.map((t) => (t.roundId === ticket.roundId ? { ...t, status: next } : t))
    )
    try {
      await advanceOrderRound(restaurant.id, ticket.roundId, next)
    } catch {
      toast.error('No se pudo avanzar el estado. Intenta de nuevo.')
      setTickets((current) => {
        const stillThere = current.some((t) => t.roundId === ticket.roundId)
        return stillThere
          ? current.map((t) => (t.roundId === ticket.roundId ? { ...t, status: previous } : t))
          : [...current, { ...ticket, status: previous }]
      })
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-headline-lg text-foreground">Cocina</h1>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center">
          <ConciergeBell className="size-6 text-muted-foreground" />
          <p className="text-body-md text-muted-foreground">No hay comandas activas por ahora.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
          {tickets.map((ticket) => {
            const badge = STATUS_BADGE[ticket.status]
            const next = nextStatus(ticket.status)
            return (
              <article key={ticket.roundId} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <header className="flex items-center justify-between border-b border-border bg-muted px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-border bg-card px-2 py-0.5 text-headline-md tabular-nums text-foreground">
                      {ticket.tableLabel}
                    </span>
                  </div>
                  <span className="text-label-lg tabular-nums text-muted-foreground">{elapsedLabel(ticket.submittedAt, now)}</span>
                </header>
                <div className="flex flex-col gap-2 p-4">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <ul className="flex flex-col divide-y divide-border">
                    {ticket.items.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-2 py-2">
                        <div>
                          <p className="text-body-md text-foreground">{item.dishName}</p>
                          {item.notes && <p className="text-body-md text-muted-foreground">{item.notes}</p>}
                        </div>
                        <span className="text-label-lg tabular-nums text-foreground">×{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  {ticket.kitchenNotes && (
                    <p className="rounded-lg border-l-4 border-warning-soft-foreground/40 bg-muted px-3 py-2 text-body-md text-foreground">
                      {ticket.kitchenNotes}
                    </p>
                  )}
                </div>
                {next && (
                  <Button className="h-11 w-full rounded-none" onClick={() => handleAdvance(ticket)}>
                    {ADVANCE_LABEL[next]}
                  </Button>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
