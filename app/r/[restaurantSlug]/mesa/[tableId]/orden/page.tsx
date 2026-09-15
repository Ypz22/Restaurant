'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCartRealtime } from '@/hooks/use-cart-realtime'
import { CartItemRow } from '@/components/cart-item-row'
import { EmptyCartState } from '@/components/empty-cart-state'
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

  useEffect(() => {
    async function load() {
      const token = getDeviceToken()
      if (!token) {
        router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}`)
        return
      }
      const session = await resumeSession(token)
      if (!session || session.sessionStatus !== 'open') {
        router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}`)
        return
      }
      setTableSessionId(session.tableSessionId)
      setDeviceToken(token)
    }
    load()
  }, [params.restaurantSlug, params.tableId, router])

  const { items, loading } = useCartRealtime({ tableSessionId, deviceToken })
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
      await submitOrderRound(token)
      router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/orden/confirmado`)
    } catch {
      setError('No se pudo enviar el pedido, intenta de nuevo.')
      setSubmitting(false)
    }
  }

  if (loading) return null

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <EmptyCartState onBrowseMenu={() => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)} />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-background p-4">
      <h1 className="text-headline-md text-onSurface">Mi Orden</h1>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <CartItemRow key={item.id} item={item} onQuantityChange={handleQuantityChange} onRemove={handleRemove} />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-2 border-t border-outline pt-4">
        {error && <p className="text-primary">{error}</p>}
        <div className="flex items-center justify-between">
          <p className="text-title-lg text-onSurface">Total: ${total.toFixed(2)}</p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-primary px-6 py-3 font-semibold text-onPrimary disabled:opacity-50"
          >
            Enviar pedido
          </button>
        </div>
      </div>
    </main>
  )
}
