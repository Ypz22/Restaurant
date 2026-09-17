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

export default function MiOrdenPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const router = useRouter()
  const [tableSessionId, setTableSessionId] = useState<string | null>(null)
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [kitchenNotes, setKitchenNotes] = useState('')
  const [tableLabel, setTableLabel] = useState('Tu mesa')
  const [photos, setPhotos] = useState<Record<string, string>>({})

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
      setTableLabel(session.tableLabel)
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
      <BrasaShell slug={params.restaurantSlug} tableId={params.tableId} tableLabel={tableLabel} active="orden"><main className="sb-main"><section className="sb-panel sb-empty"><span>▣</span><h1 className="sb-title">Tu pedido está vacío</h1><p className="sb-subtitle">Descubre las especialidades y agrega el primer plato para {tableLabel}.</p><button className="sb-primary" onClick={() => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)}>Explorar menú</button></section></main></BrasaShell>
    )
  }

  return (
    <BrasaShell slug={params.restaurantSlug} tableId={params.tableId} tableLabel={tableLabel} active="orden" count={items.reduce((sum, item) => sum + item.quantity, 0)}><main className="sb-main"><span className="sb-eyebrow">{tableLabel} · PEDIDO COMPARTIDO</span><h1 className="sb-title">Mi orden</h1><p className="sb-subtitle">Todos los platos agregados por los comensales de tu mesa aparecen aquí.</p>
      <section className="sb-panel sb-panel-wide"><div className="sb-inline-actions"><button className="sb-secondary" onClick={() => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)}>+ Agregar más platos</button></div>
        {items.map(item => <article className="sb-row" key={item.id}>{photos[item.dishId] && <Image src={photos[item.dishId]} alt={item.dishName} width={90} height={84} unoptimized />}<div className="sb-row-main"><strong>{item.dishName}</strong><small>Agregado por {item.dinerNickname}{item.notes ? ` · ${item.notes}` : ''}</small><small>${item.unitPriceSnapshot.toFixed(2)} por plato</small></div><div className="sb-stepper"><button aria-label={`Disminuir ${item.dishName}`} onClick={() => item.quantity === 1 ? handleRemove(item.id) : handleQuantityChange(item.id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button aria-label={`Aumentar ${item.dishName}`} onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>+</button></div><button className="sb-cart-link" aria-label={`Quitar ${item.dishName}`} onClick={() => handleRemove(item.id)}>Quitar</button></article>)}
        <label className="sb-label" htmlFor="kitchen-notes">Indicaciones para cocina (opcional)</label><textarea id="kitchen-notes" className="sb-textarea" rows={3} maxLength={140} placeholder="Alergias o detalles para toda la orden…" value={kitchenNotes} onChange={event => setKitchenNotes(event.target.value)} />
        {error && <div className="sb-alert" role="alert">{error}</div>}<div className="sb-total"><span>Total de la ronda</span><strong>${total.toFixed(2)}</strong></div><button className="sb-primary" disabled={submitting} onClick={handleSubmit}>{submitting ? 'Enviando…' : 'Enviar pedido'}</button>
      </section>
    </main></BrasaShell>
  )
}
