'use client'

import { useEffect, useState } from 'react'
import { BellRing, ConciergeBell, Droplets, WifiOff } from 'lucide-react'
import { useTableRequests } from '@/components/admin/requests-context'
import { Button } from '@/components/ui/button'
import type { PendingRequest } from '@/lib/data/admin-tables'

const VISIBLE_LIMIT = 3

export function requestLabel(request: PendingRequest) {
  return request.reason || (request.type === 'agua' ? 'Pide agua' : 'Llamando mesero')
}

function agoLabel(iso: string, now: number) {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000)
  return minutes < 1 ? 'ahora' : `hace ${minutes} min`
}

export function AdminRequestsBar() {
  const { requests, offline, announcement, acknowledge } = useTableRequests()
  const [expanded, setExpanded] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const visible = expanded ? requests : requests.slice(0, VISIBLE_LIMIT)
  const hidden = requests.length - visible.length

  return (
    <>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      {offline && (
        <div className="flex items-center justify-center gap-2 border-b border-border bg-warning-soft px-5 py-1.5 text-label-md text-warning-soft-foreground">
          <WifiOff className="size-4" /> Sin conexión, reintentando…
        </div>
      )}
      {requests.length > 0 && (
        <section
          aria-label="Solicitudes de mesa"
          className="z-30 border-b md:sticky md:top-14 border-border bg-warning-soft text-warning-soft-foreground"
        >
          <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-5 py-2">
            <h2 className="flex items-center gap-2 text-label-lg">
              <BellRing className="size-4" />
              <span className="tabular-nums">{requests.length}</span>
              {requests.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
            </h2>
            <ul className="flex flex-col divide-y divide-warning-soft-foreground/15">
              {visible.map((request) => {
                const Icon = request.type === 'agua' ? Droplets : ConciergeBell
                return (
                  <li key={request.id} className="flex items-center gap-3 py-1.5">
                    <Icon className="size-4 shrink-0" />
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                      <span className="text-label-lg text-foreground">{request.tableLabel}</span>
                      <span className="text-body-md">{requestLabel(request)}</span>
                      {request.notes && <span className="truncate text-body-md opacity-80">· {request.notes}</span>}
                    </div>
                    <span className="shrink-0 text-label-md tabular-nums">{agoLabel(request.createdAt, now)}</span>
                    <Button size="sm" onClick={() => acknowledge(request)}>Atender</Button>
                  </li>
                )
              })}
            </ul>
            {(hidden > 0 || expanded) && requests.length > VISIBLE_LIMIT && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="self-start rounded-lg text-label-md underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {expanded ? 'Ver menos' : `Ver ${hidden} más`}
              </button>
            )}
          </div>
        </section>
      )}
    </>
  )
}
