'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MenuDish } from '@/lib/data/menu'

export function useDishAvailabilityRealtime(restaurantId: string | null, initialDishes: MenuDish[]) {
  const [dishes, setDishes] = useState(initialDishes)

  useEffect(() => {
    setDishes(initialDishes)
  }, [initialDishes])

  useEffect(() => {
    if (!restaurantId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`dishes:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dishes', filter: `restaurant_id=eq.${restaurantId}` },
        (payload: any) => {
          setDishes((prev) =>
            prev.map((d) => (d.id === payload.new.id ? { ...d, isAvailable: payload.new.is_available } : d))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurantId])

  return dishes
}
