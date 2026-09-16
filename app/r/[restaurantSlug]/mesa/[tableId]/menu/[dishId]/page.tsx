'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QuantityStepper } from '@/components/quantity-stepper'
import { getTableByQrToken } from '@/lib/data/table'
import { getMenu, type MenuDish } from '@/lib/data/menu'
import { getDeviceToken } from '@/lib/session/device-token'
import { addCartItem } from '@/lib/data/cart'
import Image from 'next/image'
import { BrasaShell } from '@/components/brasa/shell'
import { resumeSession } from '@/lib/data/session'

export default function DishDetailPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string; dishId: string }>()
  const router = useRouter()
  const [dish, setDish] = useState<MenuDish | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [tableLabel, setTableLabel] = useState('Tu mesa')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const token = getDeviceToken()
        const session = token ? await resumeSession(token) : null
        if (!session || session.sessionStatus !== 'open' || session.qrToken !== params.tableId) {
          router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}`)
          return
        }
        const table = await getTableByQrToken(params.tableId)
        if (!table) throw new Error('Mesa no encontrada')
        setTableLabel(table.tableLabel)
        const menu = await getMenu(table.restaurantId)
        setDish(menu.dishes.find((d) => d.id === params.dishId) ?? null)
      } catch { setError('No se pudo cargar el plato. Inténtalo de nuevo.') }
      finally { setLoading(false) }
    }
    load()
  }, [params.tableId, params.dishId, params.restaurantSlug, router])

  async function handleAdd() {
    const token = getDeviceToken()
    if (!token || !dish) { router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}`); return }
    setError(null)
    setAdding(true)
    try {
      await addCartItem(token, dish.id, quantity, notes)
      router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/orden`)
    } catch {
      setError('No se pudo agregar el plato, intenta de nuevo.')
      setAdding(false)
    }
  }

  if (!dish) return <BrasaShell slug={params.restaurantSlug} tableId={params.tableId} tableLabel={tableLabel} active="menu"><main className="sb-main">{loading ? 'Cargando plato…' : error ? <div className="sb-alert" role="alert">{error}</div> : <p>Plato no encontrado.</p>}</main></BrasaShell>

  return (
    <BrasaShell slug={params.restaurantSlug} tableId={params.tableId} tableLabel={tableLabel} active="menu"><main className="sb-main">
      <button className="sb-secondary" onClick={() => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)}>← Volver al menú</button>
      <section className="sb-panel sb-panel-wide sb-detail">
        <div>{dish.photoUrl ? <Image className="sb-detail-photo" src={dish.photoUrl} alt={dish.name} width={700} height={525} unoptimized /> : <div className="sb-detail-photo sb-empty">Sin fotografía</div>}</div>
        <div className="sb-detail-copy"><span className="sb-eyebrow">SABOR & BRASA · {tableLabel}</span><h1 className="sb-title">{dish.name}</h1><p className="sb-subtitle">{dish.description}</p><div className="sb-total"><span>Precio por plato</span><strong>${dish.price.toFixed(2)}</strong></div>
          <label className="sb-label" htmlFor="dish-notes">Notas para este plato (opcional)</label><textarea id="dish-notes" className="sb-textarea" value={notes} onChange={e => setNotes(e.target.value)} maxLength={140} rows={4} placeholder="Ej. término medio, sin cebolla…" />
          <label className="sb-label">Cantidad</label><QuantityStepper value={quantity} onChange={v => setQuantity(Math.max(1, v))} min={1} />
          {error && <div className="sb-alert" role="alert">{error}</div>}
          <div className="sb-inline-actions"><button className="sb-primary" onClick={handleAdd} disabled={adding || !dish.isAvailable}>{adding ? 'Agregando…' : 'Agregar al pedido'}</button>{!dish.isAvailable && <span>No disponible en este momento</span>}</div>
        </div>
      </section>
    </main></BrasaShell>
  )
}
