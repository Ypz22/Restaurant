'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Armchair, QrCode, ConciergeBell, Droplets } from 'lucide-react'
import { useAdminRestaurant } from '@/components/admin/restaurant-context'
import { useTableRequests } from '@/components/admin/requests-context'
import { getTablesWithSessions, closeTableSession, requestLabel, type AdminTable } from '@/lib/data/admin-tables'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'

function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
}

export default function AdminMesasPage() {
  const restaurant = useAdminRestaurant()
  const [tables, setTables] = useState<AdminTable[]>([])
  const { requests, acknowledge } = useTableRequests()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [qrTable, setQrTable] = useState<AdminTable | null>(null)
  const [closingTable, setClosingTable] = useState<AdminTable | null>(null)

  useEffect(() => { void load() }, [restaurant.id])
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  async function load() {
    setLoading(true)
    setError(false)
    try {
      setTables(await getTablesWithSessions(restaurant.id))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleCloseTable() {
    if (!closingTable?.session) return
    try {
      await closeTableSession(restaurant.id, closingTable.session.id)
      setTables((current) => current.map((t) => (t.id === closingTable.id ? { ...t, session: null } : t)))
      toast.success(`${closingTable.label} cerrada.`)
    } catch {
      toast.error('No se pudo cerrar la mesa.')
    } finally {
      setClosingTable(null)
    }
  }

  const requestsByTable = new Map<string, typeof requests>()
  for (const request of requests) {
    requestsByTable.set(request.tableId, [...(requestsByTable.get(request.tableId) ?? []), request])
  }
  // Mesas con solicitudes primero, la más antigua arriba; el resto mantiene su orden.
  const oldestRequest = (tableId: string) => {
    const createdAt = requestsByTable.get(tableId)?.[0]?.createdAt
    return createdAt ? new Date(createdAt).getTime() : Infinity
  }
  const sortedTables = [...tables].sort((a, b) => {
    const diff = oldestRequest(a.id) - oldestRequest(b.id)
    return Number.isNaN(diff) ? 0 : diff
  })

  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-start gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-danger-soft p-6 text-danger-soft-foreground">
        No se pudieron cargar las mesas. <Button variant="ghost" size="sm" onClick={load}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-title-lg text-foreground">Mesas</h1>

      {tables.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center">
          <Armchair className="size-6 text-muted-foreground" />
          <p className="text-body-md text-muted-foreground">Todavía no hay mesas registradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-start gap-4">
          {sortedTables.map((table) => {
            const tableRequests = requestsByTable.get(table.id) ?? []
            return (
              <Card key={table.id} className={cn(tableRequests.length > 0 && 'ring-2 ring-primary')}>
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <CardTitle className="flex min-w-0 items-center gap-1.5">
                    <Armchair className="size-4 shrink-0" />
                    <span className="truncate">{table.label}</span>
                  </CardTitle>
                  {table.session ? (
                    <Badge variant="success">Abierta</Badge>
                  ) : (
                    <Badge variant="muted">Sin sesión</Badge>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {tableRequests.length > 0 && (
                    <ul className="flex flex-col gap-2" aria-label={`Solicitudes de ${table.label}`}>
                      {tableRequests.map((request) => {
                        const RequestIcon = request.type === 'agua' ? Droplets : ConciergeBell
                        return (
                          <li
                            key={request.id}
                            className="flex items-start gap-2 rounded-xl bg-warning-soft py-2 pr-2 pl-3 text-warning-soft-foreground"
                          >
                            <RequestIcon className="mt-0.5 size-4 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-label-lg break-words">{requestLabel(request)}</p>
                              <p className="text-label-md tabular-nums opacity-80">
                                {minutesSince(request.createdAt, now) < 1 ? 'Ahora' : `Hace ${minutesSince(request.createdAt, now)} min`}
                              </p>
                              {request.notes && <p className="mt-1 text-body-md break-words">{request.notes}</p>}
                            </div>
                            <Button size="sm" className="shrink-0" onClick={() => acknowledge(request)}>Atender</Button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {table.session ? (
                    <p className="text-body-md text-muted-foreground">
                      Abierta hace <span className="tabular-nums">{minutesSince(table.session.openedAt, now)}</span> min
                    </p>
                  ) : (
                    <p className="text-body-md text-muted-foreground">Lista para un nuevo escaneo de QR.</p>
                  )}
                </CardContent>
                <CardFooter className="gap-2">
                  <Button
                    variant="ghost" size="icon"
                    aria-label={`Ver QR de ${table.label}`} title="Ver QR"
                    onClick={() => setQrTable(table)}
                  >
                    <QrCode />
                  </Button>
                  <Button
                    variant="ghost" className="min-w-0 flex-1"
                    disabled={!table.session}
                    onClick={() => setClosingTable(table)}
                  >
                    Cerrar mesa
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!qrTable} onOpenChange={(open) => !open && setQrTable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR de {qrTable?.label}</DialogTitle>
          </DialogHeader>
          {qrTable && (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen remota generada por un servicio externo de QR, no un asset local optimizable */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
                  `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${restaurant.slug}/mesa/${qrTable.qrToken}`
                )}`}
                alt={`Código QR de ${qrTable.label}`}
                width={280}
                height={280}
              />
              <p className="text-body-md text-muted-foreground">Escanear para abrir el menú de {qrTable.label}.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!closingTable} onOpenChange={(open) => !open && setClosingTable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar {closingTable?.label}?</AlertDialogTitle>
            <AlertDialogDescription>La sesión actual se cerrará. El próximo escaneo del QR abrirá una sesión nueva.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseTable}>Cerrar mesa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
