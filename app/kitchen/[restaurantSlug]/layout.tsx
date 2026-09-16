'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { RestaurantProvider } from '@/components/admin/restaurant-context'
import { getRestaurantBySlug, type AdminRestaurant } from '@/lib/data/admin-restaurant'
import { Toaster } from '@/components/ui/sonner'

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ restaurantSlug: string }>()
  const [restaurant, setRestaurant] = useState<AdminRestaurant | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    getRestaurantBySlug(params.restaurantSlug).then((r) => {
      if (!active) return
      if (!r) setNotFound(true)
      setRestaurant(r)
    })
    return () => { active = false }
  }, [params.restaurantSlug])

  if (notFound) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-center">
        <p className="text-body-lg text-muted-foreground">No encontramos el restaurante &ldquo;{params.restaurantSlug}&rdquo;.</p>
      </div>
    )
  }

  if (!restaurant) {
    return <div className="min-h-dvh bg-background" />
  }

  return (
    <RestaurantProvider restaurant={restaurant}>
      <div className="min-h-dvh bg-background">
        <header className="sticky top-0 z-40 h-12 border-b border-border bg-card/90 backdrop-blur">
          <div className="mx-auto flex h-full items-center gap-2 px-4">
            <span className="text-label-lg text-foreground">{restaurant.name}</span>
            <span className="text-label-sm uppercase text-muted-foreground">Cocina</span>
          </div>
        </header>
        <main className="p-4">{children}</main>
      </div>
      <Toaster />
    </RestaurantProvider>
  )
}
