'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { CircleCheck, Minus, Plus, ShoppingBag, Trash2, TriangleAlert } from 'lucide-react'
import { ClientShell } from '@/components/client-shell'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { OrderStatusTracker } from '@/components/brasa/order-status-tracker'
import { useCartRealtime } from '@/hooks/use-cart-realtime'
import { getTableByQrToken } from '@/lib/data/table'
import { getMenu, type MenuDish } from '@/lib/data/menu'
import { getDeviceToken } from '@/lib/session/device-token'
import { resumeSession } from '@/lib/data/session'
import { updateCartItemQuantity, removeCartItem } from '@/lib/data/cart'
import { submitOrderRound } from '@/lib/data/orders'
import { getOrderHistory, type OrderHistoryRound } from '@/lib/data/latest-order'

function RoundSummary({ round, showTotal = false }: { round: OrderHistoryRound; showTotal?: boolean }) {
  return (
    <div className="border-y border-border py-2">
      {round.items.map(item => (
        <div key={item.id} className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
          <span className="text-body-md text-foreground">{item.quantity} × {item.dishName}{item.notes ? ` · ${item.notes}` : ''}</span>
          <strong className="shrink-0 text-title-md tabular-nums text-foreground">${(item.quantity * item.unitPrice).toFixed(2)}</strong>
        </div>
      ))}
      {round.kitchenNotes && <p className="mt-2 text-body-md text-muted-foreground">Indicaciones para cocina: {round.kitchenNotes}</p>}
      {showTotal && (
        <div className="mt-2 flex justify-between text-title-lg font-semibold text-foreground"><span>Total</span><span className="tabular-nums">${round.total.toFixed(2)}</span></div>
      )}
    </div>
  )
}

export default function MiOrdenPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const router = useRouter()
  const base = `/r/${params.restaurantSlug}/mesa/${params.tableId}`
  const [tableSessionId, setTableSessionId] = useState<string | null>(null)
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const [dinerId, setDinerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [kitchenNotes, setKitchenNotes] = useState('')
  const [tableLabel, setTableLabel] = useState('Tu mesa')
  const [restaurantName, setRestaurantName] = useState('Menú del restaurante')
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [orderHistory, setOrderHistory] = useState<OrderHistoryRound[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [selectedRound, setSelectedRound] = useState<OrderHistoryRound | null>(null)

  useEffect(() => {
    async function load() {
      const token = getDeviceToken()
      if (!token) { router.replace(base); return }
      const session = await resumeSession(token)
      if (
        !session || session.sessionStatus !== 'open' || session.qrToken !== params.tableId
        || session.restaurantSlug !== params.restaurantSlug
      ) { router.replace(base); return }
      setTableSessionId(session.tableSessionId)
      setDeviceToken(token)
      setDinerId(session.dinerId)
      setTableLabel(session.tableLabel)
      try { setOrderHistory(await getOrderHistory(token)) }
      catch { setHistoryError('No se pudieron consultar las rondas enviadas.') }
      finally { setHistoryLoading(false) }
      try {
        const table = await getTableByQrToken(params.tableId)
        if (table && table.restaurantSlug === params.restaurantSlug) {
          setRestaurantName(table.restaurantName)
          const menu = await getMenu(table.restaurantId)
          setPhotos(Object.fromEntries(menu.dishes.filter((dish: MenuDish) => dish.photoUrl).map((dish: MenuDish) => [dish.id, dish.photoUrl!])))
        }
      } catch { /* El carrito sigue disponible si las fotografías no cargan. */ }
    }
    load()
  }, [params.restaurantSlug, params.tableId, router, base])

  const { items, loading, error: cartError } = useCartRealtime({ tableSessionId, deviceToken })
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPriceSnapshot, 0)
  const pedidosPorComensal = [...items.reduce((grupos, item) => {
    const grupo = grupos.get(item.dinerId) ?? { id: item.dinerId, nickname: item.dinerNickname, items: [] as typeof items }
    grupo.items.push(item)
    grupos.set(item.dinerId, grupo)
    return grupos
  }, new Map<string, { id: string; nickname: string; items: typeof items }>()).values()]
  const ultimaRonda = orderHistory[0] ?? null
  const rondasAnteriores = orderHistory.slice(1)
  const rondasVisibles = showAllHistory ? rondasAnteriores : rondasAnteriores.slice(0, 5)
  const numeroRondaSeleccionada = selectedRound ? orderHistory.length - orderHistory.findIndex((round) => round.id === selectedRound.id) : null

  const historialDeRondas = historyLoading
    ? <p className="mt-8 text-body-md text-muted-foreground">Consultando rondas enviadas…</p>
    : historyError
      ? <p role="alert" className="mt-8 rounded-xl bg-danger-soft p-3 text-body-md text-danger-soft-foreground">{historyError}</p>
      : rondasAnteriores.length > 0 ? (
        <section className="mt-8 border-t border-border pt-6" aria-labelledby="rondas-enviadas">
          <h3 id="rondas-enviadas" className="text-title-md font-semibold text-foreground">Rondas anteriores</h3>
          <div className="mt-3 space-y-3">
            {rondasVisibles.map((round, index) => (
              <button
                type="button"
                key={round.id}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Ver detalle de Ronda ${orderHistory.length - (index + 1)}`}
                onClick={() => setSelectedRound(round)}
              >
                <span>
                  <span className="block text-title-md font-semibold text-foreground">Ronda {orderHistory.length - (index + 1)}</span>
                  <span className="mt-1 block text-label-md text-muted-foreground">{new Date(round.submittedAt).toLocaleString('es-EC')}</span>
                </span>
                <strong className="text-title-md tabular-nums text-foreground">${round.total.toFixed(2)}</strong>
              </button>
            ))}
          </div>
          {!showAllHistory && rondasAnteriores.length > rondasVisibles.length && (
            <Button variant="secondary" className="mt-4" onClick={() => setShowAllHistory(true)}>
              Ver {rondasAnteriores.length - rondasVisibles.length} rondas anteriores
            </Button>
          )}
          <Dialog open={Boolean(selectedRound)} onOpenChange={(open) => { if (!open) setSelectedRound(null) }}>
            <DialogContent className="max-h-[calc(100vh-2rem)] max-w-lg overflow-y-auto">
              {selectedRound && (
                <>
                  <DialogHeader className="items-center text-center">
                    <span className="grid size-12 place-items-center rounded-full bg-success-soft text-success-soft-foreground"><CircleCheck aria-hidden="true" className="size-6" /></span>
                    <DialogTitle>Resumen de la ronda</DialogTitle>
                    <DialogDescription>Ronda {numeroRondaSeleccionada} · {new Date(selectedRound.submittedAt).toLocaleString('es-EC')}</DialogDescription>
                  </DialogHeader>
                  <OrderStatusTracker status={selectedRound.status} />
                  <RoundSummary round={selectedRound} showTotal />
                </>
              )}
            </DialogContent>
          </Dialog>
        </section>
      ) : null

  useEffect(() => {
    if (!deviceToken || items.length > 0) return
    const interval = window.setInterval(async () => {
      try { setOrderHistory(await getOrderHistory(deviceToken)); setHistoryError(null) }
      catch { /* Conservar la última ronda visible si falla una actualización. */ }
    }, 4000)
    return () => window.clearInterval(interval)
  }, [deviceToken, items.length])

  async function handleQuantityChange(cartItemId: string, quantity: number) {
    const token = getDeviceToken()!
    setError(null)
    try { await updateCartItemQuantity(token, cartItemId, quantity) }
    catch { setError('No se pudo actualizar la cantidad, intenta de nuevo.') }
  }

  async function handleRemove(cartItemId: string) {
    const token = getDeviceToken()!
    setError(null)
    try { await removeCartItem(token, cartItemId) }
    catch { setError('No se pudo quitar el ítem, intenta de nuevo.') }
  }

  async function handleSubmit() {
    const token = getDeviceToken()!
    setError(null)
    setSubmitting(true)
    try {
      await submitOrderRound(token, kitchenNotes.trim())
      router.push(`${base}/orden/confirmado`)
    } catch {
      setError('No se pudo enviar el pedido, intenta de nuevo.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return <ClientShell base={base} restaurantName={restaurantName} tableLabel={tableLabel} active="orden"><p className="py-8 text-center text-body-lg text-muted-foreground">Cargando orden…</p></ClientShell>
  }
  if (cartError && items.length === 0) {
    return <ClientShell base={base} restaurantName={restaurantName} tableLabel={tableLabel} active="orden"><p role="alert" className="rounded-xl bg-danger-soft p-3 text-body-md text-danger-soft-foreground">{cartError}</p></ClientShell>
  }

  if (items.length === 0) {
    return (
      <ClientShell base={base} restaurantName={restaurantName} tableLabel={tableLabel} active="orden">
        {ultimaRonda ? (
          <>
            <h1 className="text-headline-lg text-foreground">Mi orden</h1>
            <p className="mt-1 text-body-lg text-muted-foreground">Tu carrito está vacío. Esta es la última ronda enviada para {tableLabel}.</p>
            <section className="mt-6 rounded-2xl border border-border bg-card p-4" aria-labelledby="ultima-ronda">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="ultima-ronda" className="text-title-lg font-semibold text-foreground">Última ronda</h2>
                  <p className="mt-1 text-label-md text-muted-foreground">Enviada {new Date(ultimaRonda.submittedAt).toLocaleString('es-EC')}</p>
                </div>
                <strong className="text-title-md tabular-nums text-foreground">${ultimaRonda.total.toFixed(2)}</strong>
              </div>
              <OrderStatusTracker status={ultimaRonda.status} />
              <div className="mt-5"><RoundSummary round={ultimaRonda} /></div>
            </section>
            <Button className="mt-5" onClick={() => router.push(`${base}/menu`)}>Seguir pidiendo</Button>
            {historialDeRondas}
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center">
              <ShoppingBag className="size-8 text-muted-foreground" aria-hidden="true" />
              <h1 className="text-headline-lg text-foreground">Tu pedido está vacío</h1>
              <p className="text-body-lg text-muted-foreground">Descubre las especialidades y agrega el primer plato para {tableLabel}.</p>
              <Button onClick={() => router.push(`${base}/menu`)}>Explorar menú</Button>
            </div>
            {historialDeRondas}
          </>
        )}
      </ClientShell>
    )
  }

  return (
    <ClientShell base={base} restaurantName={restaurantName} tableLabel={tableLabel} active="orden" count={count}>
      <span className="text-label-sm uppercase text-muted-foreground">{tableLabel} · Pedido compartido</span>
      <h1 className="mt-1 text-headline-lg text-foreground">Mi orden</h1>
      <p className="mt-1 text-body-lg text-muted-foreground">Todos los platos agregados por los comensales de tu mesa aparecen aquí.</p>

      <Button variant="secondary" className="mt-4" onClick={() => router.push(`${base}/menu`)}><Plus className="size-4" /> Agregar más platos</Button>

      {pedidosPorComensal.map((pedido) => {
        const cantidadDePlatos = pedido.items.reduce((suma, item) => suma + item.quantity, 0)
        const encabezadoId = `pedido-${pedido.id}`
        const esMiPedido = pedido.id === dinerId

        return (
          <section key={pedido.id} className="mt-5 border-b border-border pb-5" role="region" aria-labelledby={encabezadoId}>
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-label-md font-semibold text-secondary-foreground" aria-hidden="true">
                {pedido.nickname.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id={encabezadoId} className="text-title-md font-semibold text-foreground">{pedido.nickname}</h3>
                  {esMiPedido && <span className="rounded-full bg-highlight px-2 py-0.5 text-label-md font-semibold text-highlight-foreground">Tú</span>}
                </div>
                <p className="text-label-md text-muted-foreground">{cantidadDePlatos} {cantidadDePlatos === 1 ? 'plato' : 'platos'}</p>
              </div>
            </div>

            {pedido.items.map(item => (
              <div key={item.id} className="mt-3 flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {photos[item.dishId] && <Image src={photos[item.dishId]} alt={item.dishName} fill sizes="56px" unoptimized className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-title-md text-foreground">{item.dishName}</p>
                  {item.notes && <p className="text-label-md text-muted-foreground">{item.notes}</p>}
                  <p className="text-label-md tabular-nums text-muted-foreground">${item.unitPriceSnapshot.toFixed(2)} por plato</p>
                </div>
                <div className="flex shrink-0 items-center rounded-full bg-muted">
                  <button
                    type="button"
                    aria-label={`Disminuir ${item.dishName}`}
                    onClick={() => item.quantity === 1 ? handleRemove(item.id) : handleQuantityChange(item.id, item.quantity - 1)}
                    className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  ><Minus className="size-4" /></button>
                  <span className="w-4 text-center text-label-lg tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Aumentar ${item.dishName}`}
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    className="flex size-11 items-center justify-center rounded-full text-foreground hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  ><Plus className="size-4" /></button>
                </div>
                <button type="button" aria-label={`Quitar ${item.dishName}`} onClick={() => handleRemove(item.id)} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </section>
        )
      })}

      <label className="mt-2 block text-label-md text-muted-foreground" htmlFor="kitchen-notes">Indicaciones para cocina (opcional)</label>
      <Textarea id="kitchen-notes" className="mt-2 rounded-2xl bg-muted" rows={3} maxLength={140} placeholder="Alergias o detalles para toda la orden…" value={kitchenNotes} onChange={event => setKitchenNotes(event.target.value)} />

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-body-md text-danger-soft-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between text-title-lg font-semibold text-foreground">
        <span>Total de la ronda</span><span className="tabular-nums">${total.toFixed(2)}</span>
      </div>
      <Button className="mt-3 w-full" disabled={submitting} onClick={handleSubmit}>{submitting ? 'Enviando…' : 'Enviar pedido'}</Button>
    </ClientShell>
  )
}
