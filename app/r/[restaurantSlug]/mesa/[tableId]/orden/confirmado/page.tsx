'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CircleCheck } from 'lucide-react'
import { ClientShell } from '@/components/client-shell'
import { Button } from '@/components/ui/button'
import { OrderStatusTracker } from '@/components/brasa/order-status-tracker'
import { getDeviceToken } from '@/lib/session/device-token'
import { resumeSession } from '@/lib/data/session'
import { getLatestOrder, type LatestOrder } from '@/lib/data/latest-order'

export default function PedidoConfirmadoPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<LatestOrder | null>(null)
  const [tableLabel, setTableLabel] = useState('Tu mesa')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const base = `/r/${params.restaurantSlug}/mesa/${params.tableId}`
  const orderId = order?.id

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const token = getDeviceToken()
        const session = token ? await resumeSession(token) : null
        if (
          !session || session.sessionStatus !== 'open' || session.qrToken !== params.tableId
          || session.restaurantSlug !== params.restaurantSlug
        ) { router.replace(base); return }
        const latest = await getLatestOrder(token!)
        if (active) {
          setTableLabel(session.tableLabel)
          setOrder(latest)
        }
      } catch { if (active) setError('No se pudo consultar el pedido. Inténtalo de nuevo.') }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [base, params.tableId, params.restaurantSlug, router])

  useEffect(() => {
    if (!orderId) return
    const interval = window.setInterval(async () => {
      const token = getDeviceToken()
      if (!token) return
      try { setOrder(await getLatestOrder(token)) } catch { /* Conservar el último estado visible. */ }
    }, 4000)
    return () => { window.clearInterval(interval) }
  }, [orderId])

  return (
    <ClientShell base={base} restaurantName="Menú del restaurante" tableLabel={tableLabel} active="orden">
      {loading ? (
        <p className="py-8 text-center text-body-lg text-muted-foreground">Consultando pedido…</p>
      ) : error ? (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-body-md text-danger-soft-foreground">{error}</p>
      ) : order ? (
        <>
          <span className="grid size-16 place-items-center rounded-full bg-success-soft text-success-soft-foreground"><CircleCheck className="size-8" aria-hidden="true" /></span>
          <span className="mt-3 block text-label-sm uppercase text-muted-foreground">Comanda confirmada</span>
          <h1 className="text-headline-lg text-foreground">¡Pedido enviado a cocina!</h1>
          <p className="mt-1 text-body-lg text-muted-foreground">La ronda de {tableLabel} fue recibida. Puedes seguir agregando platos para una nueva ronda.</p>
          <OrderStatusTracker status={order.status} />
          <p className="mt-4 text-body-md text-muted-foreground">Enviado: {new Date(order.submittedAt).toLocaleString('es-EC')}</p>
          <section className="mt-4">
            <h2 className="text-title-md font-semibold text-foreground">Resumen de la ronda</h2>
            <div className="mt-2 border-y border-border">
              {order.items.map(item => (
                <div key={item.id} className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
                  <span className="text-body-md text-foreground">{item.quantity} × {item.dishName}{item.notes ? ` · ${item.notes}` : ''}</span>
                  <strong className="shrink-0 text-title-md tabular-nums text-foreground">${(item.quantity * item.unitPrice).toFixed(2)}</strong>
                </div>
              ))}
            </div>
            {order.kitchenNotes && <p className="mt-3 text-body-md text-muted-foreground">Indicaciones para cocina: {order.kitchenNotes}</p>}
            <div className="mt-3 flex items-center justify-between text-title-lg font-semibold text-foreground"><span>Total</span><span className="tabular-nums">${order.total.toFixed(2)}</span></div>
          </section>
        </>
      ) : (
        <>
          <h1 className="text-headline-lg text-foreground">Aún no hay una ronda enviada</h1>
          <p className="mt-1 text-body-lg text-muted-foreground">Agrega platos a la orden y envíala cuando esté lista.</p>
        </>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={() => router.push(`${base}/menu`)}>Seguir pidiendo</Button>
        <Button variant="secondary" onClick={() => router.push(`${base}/orden`)}>Ver mi orden</Button>
      </div>
    </ClientShell>
  )
}
