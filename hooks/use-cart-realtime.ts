'use client'

import { useEffect, useState } from 'react'
import { getCart, type CartItemWithDetails } from '@/lib/data/cart'

export function useCartRealtime(params: { tableSessionId: string | null; deviceToken: string | null }) {
  const { tableSessionId, deviceToken } = params
  const [items, setItems] = useState<CartItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tableSessionId || !deviceToken) return
    async function refresh() {
      try {
        const fresh = await getCart(deviceToken!)
        setItems(fresh)
        setError(null)
      } catch {
        setError('No se pudo actualizar el carrito. Comprueba tu conexión.')
      } finally { setLoading(false) }
    }

    // The private cart table cannot be streamed to anonymous clients. The
    // device-token RPC refreshes the shared cart for everyone at the table.
    void refresh()
    const interval = window.setInterval(() => { void refresh() }, 2500)

    return () => {
      window.clearInterval(interval)
    }
  }, [tableSessionId, deviceToken])

  return { items, loading, error }
}
