'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCartRealtime } from '@/hooks/use-cart-realtime'
import Image from 'next/image'
import { BrasaShell } from '@/components/brasa/shell'
import { getTableByQrToken } from '@/lib/data/table'
import { getMenu, type MenuDish } from '@/lib/data/menu'
import { getDeviceToken } from '@/lib/session/device-token'
import { resumeSession } from '@/lib/data/session'
import { updateCartItemQuantity, removeCartItem } from '@/lib/data/cart'
import { submitOrderRound } from '@/lib/data/orders'
import { getOrderHistory, type OrderHistoryRound } from '@/lib/data/latest-order'
import { CircleCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { OrderStatusTracker } from '@/components/brasa/order-status-tracker'

export default function MiOrdenPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const router = useRouter()
  const [tableSessionId, setTableSessionId] = useState<string | null>(null)
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const [dinerId, setDinerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [kitchenNotes, setKitchenNotes] = useState('')
  const [tableLabel, setTableLabel] = useState('Tu mesa')
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [orderHistory, setOrderHistory] = useState<OrderHistoryRound[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [selectedRound, setSelectedRound] = useState<OrderHistoryRound | null>(null)

  useEffect(() => {
    async function load() {
      const token = getDeviceToken()
      if (!token) {
        router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}`)
        return
      }
      const session = await resumeSession(token)
      if (
        !session || session.sessionStatus !== 'open' || session.qrToken !== params.tableId
        || session.restaurantSlug !== params.restaurantSlug
      ) {
        router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}`)
        return
      }
      setTableSessionId(session.tableSessionId)
      setDeviceToken(token)
      setDinerId(session.dinerId)
      setTableLabel(session.tableLabel)
      try {
        setOrderHistory(await getOrderHistory(token))
      } catch {
        setHistoryError('No se pudieron consultar las rondas enviadas.')
      } finally {
        setHistoryLoading(false)
      }
      try {
        const table = await getTableByQrToken(params.tableId)
        if (table && table.restaurantSlug === params.restaurantSlug) {
          const menu = await getMenu(table.restaurantId)
          setPhotos(Object.fromEntries(menu.dishes.filter((dish: MenuDish) => dish.photoUrl).map((dish: MenuDish) => [dish.id, dish.photoUrl!])))
        }
      } catch { /* El carrito sigue disponible si las fotografías no cargan. */ }
    }
    load()
  }, [params.restaurantSlug, params.tableId, router])

  const { items, loading, error: cartError } = useCartRealtime({ tableSessionId, deviceToken })
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
  const historialDeRondas = historyLoading ? <p className="sb-subtitle">Consultando rondas enviadas…</p> : historyError ? <div className="sb-alert" role="alert">{historyError}</div> : rondasAnteriores.length > 0 ? <section className="mt-8 border-t border-border pt-6" aria-labelledby="rondas-enviadas">
    <h3 id="rondas-enviadas" className="text-title-md font-semibold text-foreground">Rondas anteriores</h3>
    <div className="mt-3 space-y-3">
      {rondasVisibles.map((round, index) => <button type="button" key={round.id} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Ver detalle de Ronda ${orderHistory.length - (index + 1)}`} onClick={() => setSelectedRound(round)}><span><span className="block text-title-md font-semibold text-foreground">Ronda {orderHistory.length - (index + 1)}</span><span className="mt-1 block text-label-md text-muted-foreground">{new Date(round.submittedAt).toLocaleString('es-EC')}</span></span><strong className="text-title-md tabular-nums text-foreground">${round.total.toFixed(2)}</strong></button>)}
    </div>
    {!showAllHistory && rondasAnteriores.length > rondasVisibles.length && <button type="button" className="sb-secondary mt-4" onClick={() => setShowAllHistory(true)}>Ver {rondasAnteriores.length - rondasVisibles.length} rondas anteriores</button>}
    <Dialog open={Boolean(selectedRound)} onOpenChange={(open) => { if (!open) setSelectedRound(null) }}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-lg overflow-y-auto">
        {selectedRound && <><DialogHeader className="items-center text-center"><span className="grid size-12 place-items-center rounded-full bg-success-soft text-success-soft-foreground"><CircleCheck aria-hidden="true" className="size-6" /></span><DialogTitle>Resumen de la ronda</DialogTitle><DialogDescription>Ronda {numeroRondaSeleccionada} · {new Date(selectedRound.submittedAt).toLocaleString('es-EC')}</DialogDescription></DialogHeader>
          <OrderStatusTracker status={selectedRound.status} />
          <div className="border-y border-border py-2">{selectedRound.items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0"><span className="text-body-md text-foreground">{item.quantity} × {item.dishName}{item.notes ? ` · ${item.notes}` : ''}</span><strong className="shrink-0 text-title-md tabular-nums text-foreground">${(item.quantity * item.unitPrice).toFixed(2)}</strong></div>)}</div>
          {selectedRound.kitchenNotes && <p className="mt-4 text-body-md text-muted-foreground">Indicaciones para cocina: {selectedRound.kitchenNotes}</p>}
          <div className="mt-4 flex justify-between text-title-lg font-semibold text-foreground"><span>Total</span><span className="tabular-nums">${selectedRound.total.toFixed(2)}</span></div>
        </>}
      </DialogContent>
    </Dialog>
  </section> : null

  useEffect(() => {
    if (!deviceToken || items.length > 0) return
    const interval = window.setInterval(async () => {
      try {
        setOrderHistory(await getOrderHistory(deviceToken))
        setHistoryError(null)
      } catch { /* Conservar la última ronda visible si falla una actualización. */ }
    }, 4000)
    return () => window.clearInterval(interval)
  }, [deviceToken, items.length])

  async function handleQuantityChange(cartItemId: string, quantity: number) {
    const token = getDeviceToken()!
    setError(null)
    try {
      await updateCartItemQuantity(token, cartItemId, quantity)
    } catch {
      setError('No se pudo actualizar la cantidad, intenta de nuevo.')
    }
  }

  async function handleRemove(cartItemId: string) {
    const token = getDeviceToken()!
    setError(null)
    try {
      await removeCartItem(token, cartItemId)
    } catch {
      setError('No se pudo quitar el ítem, intenta de nuevo.')
    }
  }

  async function handleSubmit() {
    const token = getDeviceToken()!
    setError(null)
    setSubmitting(true)
    try {
      await submitOrderRound(token, kitchenNotes.trim())
      router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/orden/confirmado`)
    } catch {
      setError('No se pudo enviar el pedido, intenta de nuevo.')
      setSubmitting(false)
    }
  }

  if (loading) return <BrasaShell slug={params.restaurantSlug} tableId={params.tableId} active="orden"><main className="sb-main">Cargando orden…</main></BrasaShell>
  if (cartError && items.length === 0) return <BrasaShell slug={params.restaurantSlug} tableId={params.tableId} tableLabel={tableLabel} active="orden"><main className="sb-main"><div className="sb-alert" role="alert">{cartError}</div></main></BrasaShell>

  if (items.length === 0) {
    return (
      <BrasaShell slug={params.restaurantSlug} tableId={params.tableId} tableLabel={tableLabel} active="orden"><main className="sb-main"><section className="sb-panel">{ultimaRonda ? <><h1 className="sb-title">Mi orden</h1><p className="sb-subtitle">Tu carrito está vacío. Esta es la última ronda enviada para {tableLabel}.</p><section className="mt-6 rounded-2xl border border-border bg-card p-4" aria-labelledby="ultima-ronda"><div className="flex items-start justify-between gap-4"><div><h2 id="ultima-ronda" className="text-title-lg font-semibold text-foreground">Última ronda</h2><p className="mt-1 text-label-md text-muted-foreground">Enviada {new Date(ultimaRonda.submittedAt).toLocaleString('es-EC')}</p></div><strong className="text-title-md tabular-nums text-foreground">${ultimaRonda.total.toFixed(2)}</strong></div><OrderStatusTracker status={ultimaRonda.status} /><div className="mt-5 border-t border-border">{ultimaRonda.items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0"><span className="text-body-md text-foreground">{item.quantity} × {item.dishName}{item.notes ? ` · ${item.notes}` : ''}</span><strong className="shrink-0 text-title-md tabular-nums text-foreground">${(item.quantity * item.unitPrice).toFixed(2)}</strong></div>)}</div>{ultimaRonda.kitchenNotes && <p className="mt-4 text-body-md text-muted-foreground">Indicaciones para cocina: {ultimaRonda.kitchenNotes}</p>}</section><div className="sb-inline-actions"><button className="sb-primary" onClick={() => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)}>Seguir pidiendo</button></div>{historialDeRondas}</> : <><div className="sb-empty"><span>▣</span><h1 className="sb-title">Tu pedido está vacío</h1><p className="sb-subtitle">Descubre las especialidades y agrega el primer plato para {tableLabel}.</p><button className="sb-primary" onClick={() => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)}>Explorar menú</button></div>{historialDeRondas}</>}</section></main></BrasaShell>
    )
  }

  return (
    <BrasaShell slug={params.restaurantSlug} tableId={params.tableId} tableLabel={tableLabel} active="orden" count={items.reduce((sum, item) => sum + item.quantity, 0)}><main className="sb-main"><span className="sb-eyebrow">{tableLabel} · PEDIDO COMPARTIDO</span><h1 className="sb-title">Mi orden</h1><p className="sb-subtitle">Todos los platos agregados por los comensales de tu mesa aparecen aquí.</p>
      <section className="sb-panel sb-panel-wide"><div className="sb-inline-actions"><button className="sb-secondary" onClick={() => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)}>+ Agregar más platos</button></div>
        {pedidosPorComensal.map((pedido) => {
          const cantidadDePlatos = pedido.items.reduce((suma, item) => suma + item.quantity, 0)
          const encabezadoId = `pedido-${pedido.id}`
          const esMiPedido = pedido.id === dinerId

          return <section key={pedido.id} className="border-b border-border py-5 first:pt-3 last:border-b-0" role="region" aria-labelledby={encabezadoId}>
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-label-md font-semibold text-secondary-foreground" aria-hidden="true">{pedido.nickname.slice(0, 1).toUpperCase()}</span>
              <div>
                <div className="flex items-center gap-2"><h3 id={encabezadoId} className="text-title-md font-semibold text-foreground">{pedido.nickname}</h3>{esMiPedido && <span className="rounded-full bg-highlight px-2 py-0.5 text-label-md font-semibold text-highlight-foreground">Tú</span>}</div>
                <p className="text-label-md text-muted-foreground">{cantidadDePlatos} {cantidadDePlatos === 1 ? 'plato' : 'platos'}</p>
              </div>
            </div>
            {pedido.items.map(item => <article className="sb-row last:border-b-0" key={item.id}>{photos[item.dishId] && <Image src={photos[item.dishId]} alt={item.dishName} width={90} height={84} unoptimized />}<div className="sb-row-main"><strong>{item.dishName}</strong>{item.notes && <small>{item.notes}</small>}<small className="tabular-nums">${item.unitPriceSnapshot.toFixed(2)} por plato</small></div><div className="sb-stepper"><button aria-label={`Disminuir ${item.dishName}`} onClick={() => item.quantity === 1 ? handleRemove(item.id) : handleQuantityChange(item.id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button aria-label={`Aumentar ${item.dishName}`} onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>+</button></div><button className="sb-cart-link" aria-label={`Quitar ${item.dishName}`} onClick={() => handleRemove(item.id)}>Quitar</button></article>)}
          </section>
        })}
        <label className="sb-label" htmlFor="kitchen-notes">Indicaciones para cocina (opcional)</label><textarea id="kitchen-notes" className="sb-textarea" rows={3} maxLength={140} placeholder="Alergias o detalles para toda la orden…" value={kitchenNotes} onChange={event => setKitchenNotes(event.target.value)} />
        {error && <div className="sb-alert" role="alert">{error}</div>}<div className="sb-total"><span>Total de la ronda</span><strong>${total.toFixed(2)}</strong></div><button className="sb-primary" disabled={submitting} onClick={handleSubmit}>{submitting ? 'Enviando…' : 'Enviar pedido'}</button>
      </section>
    </main></BrasaShell>
  )
}
