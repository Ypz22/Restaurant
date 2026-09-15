'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCart, type CartItemWithDetails } from '@/lib/data/cart'

export function useCartRealtime(params: { tableSessionId: string | null; deviceToken: string | null }) {
  const { tableSessionId, deviceToken } = params
  const [items, setItems] = useState<CartItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tableSessionId || !deviceToken) return
    const supabase = createClient()

    async function refresh() {
      const fresh = await getCart(deviceToken!)
      setItems(fresh)
      setLoading(false)
    }

    const channel = supabase
      .channel(`cart:${tableSessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items', filter: `table_session_id=eq.${tableSessionId}` },
        () => refresh()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refresh()
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableSessionId, deviceToken])

  return { items, loading }
}
