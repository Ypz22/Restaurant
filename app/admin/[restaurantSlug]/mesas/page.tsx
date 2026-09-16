'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Armchair, QrCode, ConciergeBell, Droplets } from 'lucide-react'
import { useAdminRestaurant } from '@/components/admin/restaurant-context'
import {
  getTablesWithSessions, closeTableSession, getPendingRequests, acknowledgeRequest,
  type AdminTable, type PendingRequest,
} from '@/lib/data/admin-tables'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
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
  const [requests, setRequests] = useState<PendingRequest[]>([])
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
      const [tablesData, requestsData] = await Promise.all([
        getTablesWithSessions(restaurant.id),
        getPendingRequests(restaurant.id),
      ])
      setTables(tablesData)
      setRequests(requestsData)
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

  async function handleAcknowledge(request: PendingRequest) {
    setRequests((current) => current.filter((r) => r.id !== request.id))
    try {
      await acknowledgeRequest(restaurant.id, request.id)
    } catch {
      toast.error('No se pudo marcar la solicitud como atendida.')
      setRequests((current) => [...current, request])
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
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

      {requests.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-label-lg uppercase text-muted-foreground">Solicitudes pendientes</h2>
          <div className="flex flex-col gap-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 rounded-xl bg-card p-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  {r.type === 'agua' ? <Droplets className="size-4 text-secondary-foreground" /> : <ConciergeBell className="size-4 text-secondary-foreground" />}
                  <div>
                    <p className="text-body-md font-medium text-foreground">{r.tableLabel} · {r.reason || (r.type === 'agua' ? 'Agua' : 'Llamar al mesero')}</p>
                    {r.notes && <p className="text-label-sm text-muted-foreground">{r.notes}</p>}
                  </div>
                </div>
                <Button size="sm" onClick={() => handleAcknowledge(r)}>Atender</Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tables.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center">
          <Armchair className="size-6 text-muted-foreground" />
          <p className="text-body-md text-muted-foreground">Todavía no hay mesas registradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {tables.map((table) => (
            <Card key={table.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-1.5"><Armchair className="size-4" />{table.label}</CardTitle>
                {table.session ? (
                  <Badge variant="success">Abierta</Badge>
                ) : (
                  <Badge variant="muted">Sin sesión</Badge>
                )}
              </CardHeader>
              <CardContent>
                {table.session ? (
                  <p className="text-body-md text-muted-foreground">
                    Abierta hace <span className="tabular-nums">{minutesSince(table.session.openedAt, now)}</span> min
                  </p>
                ) : (
                  <p className="text-body-md text-muted-foreground">Lista para un nuevo escaneo de QR.</p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" onClick={() => setQrTable(table)}>
                  <QrCode className="size-4" /> Ver QR
                </Button>
                <Button
                  variant="destructive" size="sm"
                  disabled={!table.session}
                  onClick={() => setClosingTable(table)}
                >
                  Cerrar mesa
                </Button>
              </CardFooter>
            </Card>
          ))}
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
