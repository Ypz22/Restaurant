'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BrasaShell } from '@/components/brasa/shell'
import { getDeviceToken } from '@/lib/session/device-token'
import { resumeSession } from '@/lib/data/session'
import { getLatestOrder, type LatestOrder } from '@/lib/data/latest-order'

const statusLabels: Record<LatestOrder['status'], string> = { pending: 'Recibido en cocina', preparing: 'En preparación', ready: 'Listo para servir', delivered: 'Entregado' }

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
        if (active) { setTableLabel(session.tableLabel); setOrder(latest) }
      } catch { if (active) setError('No se pudo consultar el pedido. Inténtalo de nuevo.') }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [base, params.tableId, router])

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
    <BrasaShell slug={params.restaurantSlug} tableId={params.tableId} tableLabel={tableLabel} active="orden"><main className="sb-main"><section className="sb-panel">
      {loading ? <p className="sb-subtitle">Consultando pedido…</p> : error ? <div className="sb-alert" role="alert">{error}</div> : order ? <>
        <div className="sb-confirm-icon">✓</div><span className="sb-eyebrow">COMANDA CONFIRMADA</span><h1 className="sb-title">¡Pedido enviado a cocina!</h1><p className="sb-subtitle">La ronda de {tableLabel} fue recibida. Puedes seguir agregando platos para una nueva ronda.</p>
        <p className="sb-confirm-status" role="status">Estado: {statusLabels[order.status]}</p><p className="sb-subtitle">Enviado: {new Date(order.submittedAt).toLocaleString('es-EC')}</p>
        <div className="sb-confirm-lines"><h2>Resumen de la ronda</h2>{order.items.map(item => <div key={item.id}><span>{item.quantity} × {item.dishName}{item.notes ? ` · ${item.notes}` : ''}</span><strong>${(item.quantity * item.unitPrice).toFixed(2)}</strong></div>)}</div>
        {order.kitchenNotes && <p className="sb-subtitle">Indicaciones para cocina: {order.kitchenNotes}</p>}<div className="sb-total"><span>Total</span><strong>${order.total.toFixed(2)}</strong></div>
      </> : <><h1 className="sb-title">Aún no hay una ronda enviada</h1><p className="sb-subtitle">Agrega platos a la orden y envíala cuando esté lista.</p></>}
      <div className="sb-inline-actions"><button className="sb-primary" onClick={() => router.push(`${base}/menu`)}>Seguir pidiendo</button><button className="sb-secondary" onClick={() => router.push(`${base}/orden`)}>Ver mi orden</button></div>
    </section></main></BrasaShell>
  )
}
