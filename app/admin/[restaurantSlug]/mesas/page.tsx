'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Armchair, QrCode, ConciergeBell, Droplets, Plus, Pencil } from 'lucide-react'
import { useAdminRestaurant } from '@/components/admin/restaurant-context'
import { useTableRequests } from '@/components/admin/requests-context'
import {
  getTablesWithSessions, closeTableSession, requestLabel, tableStatus,
  createTable, renameTable, setTableAvailability, regenerateTableQr, deleteTable,
  type AdminTable, type TableAvailability, type TableStatus,
} from '@/lib/data/admin-tables'
import { CreateTableDialog, EditTableDialog, TableQrDialog } from '@/components/admin/table-dialogs'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { usePolling } from '@/hooks/use-polling'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'

const STATUS: Record<TableStatus, { label: string; variant: 'info' | 'highlight' | 'muted' | 'success'; hint: string }> = {
  occupied: { label: 'Ocupada', variant: 'info', hint: '' },
  reserved: { label: 'Reservada', variant: 'highlight', hint: 'Se libera sola cuando los comensales escanean el QR.' },
  unavailable: { label: 'No disponible', variant: 'muted', hint: 'Fuera de servicio: el QR no abre la mesa.' },
  available: { label: 'Disponible', variant: 'success', hint: 'Lista para recibir comensales.' },
}

type Filter = 'all' | TableStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'available', label: 'Disponibles' },
  { value: 'occupied', label: 'Ocupadas' },
  { value: 'reserved', label: 'Reservadas' },
  { value: 'unavailable', label: 'No disponibles' },
]

const AVAILABILITY_OPTIONS: { value: TableAvailability; label: string }[] = [
  { value: 'available', label: 'Disponible' },
  { value: 'reserved', label: 'Reservada' },
  { value: 'unavailable', label: 'No disponible' },
]

function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
}

export default function AdminMesasPage() {
  const restaurant = useAdminRestaurant()
  const [tables, setTables] = useState<AdminTable[]>([])
  const { requests, acknowledge } = useTableRequests()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [filter, setFilter] = useState<Filter>('all')
  const [creating, setCreating] = useState(false)
  const [qrTableId, setQrTableId] = useState<string | null>(null)
  const [editTableId, setEditTableId] = useState<string | null>(null)
  const [closingTable, setClosingTable] = useState<AdminTable | null>(null)

  const loaded = useRef(false)
  const mutations = useRef({ inFlight: 0, lastEndedAt: 0 })

  usePolling(load, undefined, restaurant.id)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  async function load() {
    const startedAt = Date.now()
    try {
      const fresh = await getTablesWithSessions(restaurant.id)
      // No pisar un cambio local que esta consulta todavía no refleja.
      const m = mutations.current
      if (m.inFlight > 0 || startedAt < m.lastEndedAt) return
      setTables(fresh)
      loaded.current = true
      setError(false)
    } catch {
      if (!loaded.current) setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function mutate<T>(action: () => Promise<T>): Promise<T> {
    mutations.current.inFlight++
    try {
      return await action()
    } finally {
      mutations.current.inFlight--
      mutations.current.lastEndedAt = Date.now()
    }
  }

  function replaceTable(updated: AdminTable) {
    setTables((current) => current.map((t) => (t.id === updated.id ? { ...updated, session: t.session } : t)))
  }

  async function handleCloseTable() {
    if (!closingTable?.session) return
    try {
      await mutate(() => closeTableSession(restaurant.id, closingTable.session!.id))
      setTables((current) => current.map((t) => (t.id === closingTable.id ? { ...t, session: null } : t)))
      toast.success(`${closingTable.label} cerrada y disponible.`)
    } catch {
      toast.error('No se pudo cerrar la mesa.')
    } finally {
      setClosingTable(null)
    }
  }

  async function handleCreate(label: string) {
    const table = await mutate(() => createTable(restaurant.id, label))
    setTables((current) => [...current, table])
    setCreating(false)
    setQrTableId(table.id)
    toast.success(`${table.label} creada.`)
  }

  async function handleAvailability(table: AdminTable, availability: TableAvailability) {
    replaceTable({ ...table, availability })
    try {
      replaceTable(await mutate(() => setTableAvailability(restaurant.id, table.id, availability)))
    } catch (err) {
      replaceTable(table)
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado.')
    }
  }

  const editTable = tables.find((t) => t.id === editTableId) ?? null
  const qrTable = tables.find((t) => t.id === qrTableId) ?? null

  const requestsByTable = new Map<string, typeof requests>()
  for (const request of requests) {
    requestsByTable.set(request.tableId, [...(requestsByTable.get(request.tableId) ?? []), request])
  }
  // Mesas con solicitudes primero (la más antigua arriba); el resto por nombre.
  const oldestRequest = (tableId: string) => {
    const createdAt = requestsByTable.get(tableId)?.[0]?.createdAt
    return createdAt ? new Date(createdAt).getTime() : Number.MAX_SAFE_INTEGER
  }
  const counts: Record<Filter, number> = { all: tables.length, available: 0, occupied: 0, reserved: 0, unavailable: 0 }
  for (const table of tables) counts[tableStatus(table)]++
  const visibleTables = tables
    .filter((t) => filter === 'all' || tableStatus(t) === filter)
    .sort((a, b) => oldestRequest(a.id) - oldestRequest(b.id) || a.label.localeCompare(b.label, 'es', { numeric: true }))

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
        No se pudieron cargar las mesas. <Button variant="ghost" size="sm" onClick={() => void load()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title-lg text-foreground">Mesas</h1>
        <Button onClick={() => setCreating(true)}><Plus /> Nueva mesa</Button>
      </div>

      {tables.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center">
          <Armchair className="size-6 text-muted-foreground" />
          <p className="text-body-md text-muted-foreground">Todavía no hay mesas.</p>
          <Button onClick={() => setCreating(true)}><Plus /> Crear primera mesa</Button>
        </div>
      ) : (
        <>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList aria-label="Filtrar mesas por estado">
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value} className="gap-1.5">
                  {f.label} <span className="tabular-nums opacity-80">{counts[f.value]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {visibleTables.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-8 text-center text-body-md text-muted-foreground">
              No hay mesas con este estado.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-start gap-4">
              {visibleTables.map((table) => {
                const status = tableStatus(table)
                const tableRequests = requestsByTable.get(table.id) ?? []
                return (
                  <Card
                    key={table.id}
                    className={cn(tableRequests.length > 0 && 'ring-2 ring-primary', status === 'unavailable' && 'border-dashed shadow-none')}
                  >
                    <CardHeader className="flex-row items-center justify-between gap-2">
                      <CardTitle className="flex min-w-0 items-center gap-1.5">
                        <Armchair className="size-4 shrink-0" />
                        <span className="truncate">{table.label}</span>
                      </CardTitle>
                      <Badge variant={STATUS[status].variant}>{STATUS[status].label}</Badge>
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
                      <p className="text-body-md text-muted-foreground">
                        {table.session ? (
                          <>Ocupada hace <span className="tabular-nums">{minutesSince(table.session.openedAt, now)}</span> min</>
                        ) : STATUS[status].hint}
                      </p>
                    </CardContent>
                    <CardFooter className="gap-2">
                      <Button
                        variant="ghost" size="icon"
                        aria-label={`Ver QR de ${table.label}`} title="Ver QR"
                        onClick={() => setQrTableId(table.id)}
                      >
                        <QrCode />
                      </Button>
                      {table.session ? (
                        <Button variant="ghost" className="min-w-0 flex-1" onClick={() => setClosingTable(table)}>
                          Cerrar mesa
                        </Button>
                      ) : (
                        <select
                          aria-label={`Estado de ${table.label}`}
                          value={table.availability}
                          onChange={(e) => handleAvailability(table, e.target.value as TableAvailability)}
                          className="h-11 min-w-0 flex-1 cursor-pointer rounded-xl border border-input bg-card px-3 text-label-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {AVAILABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        aria-label={`Editar ${table.label}`} title="Editar mesa"
                        onClick={() => setEditTableId(table.id)}
                      >
                        <Pencil />
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      <CreateTableDialog open={creating} onClose={() => setCreating(false)} onCreate={handleCreate} />

      <TableQrDialog
        table={qrTable} restaurantSlug={restaurant.slug} restaurantName={restaurant.name}
        onClose={() => setQrTableId(null)}
      />

      <EditTableDialog
        table={editTable}
        onClose={() => setEditTableId(null)}
        onRename={async (label) => {
          replaceTable(await mutate(() => renameTable(restaurant.id, editTable!.id, label)))
          toast.success('Nombre actualizado.')
        }}
        onRegenerate={async () => {
          replaceTable(await mutate(() => regenerateTableQr(restaurant.id, editTable!.id)))
          const id = editTable!.id
          setEditTableId(null)
          setQrTableId(id)
          toast.success('QR regenerado. Imprime el nuevo código.')
        }}
        onDelete={async () => {
          const { id, label } = editTable!
          await mutate(() => deleteTable(restaurant.id, id))
          setTables((current) => current.filter((t) => t.id !== id))
          setEditTableId(null)
          toast.success(`${label} eliminada.`)
        }}
      />

      <AlertDialog open={!!closingTable} onOpenChange={(open) => !open && setClosingTable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar {closingTable?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              La sesión actual termina y la mesa queda disponible. El próximo escaneo del QR abrirá una sesión nueva.
            </AlertDialogDescription>
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
