'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AdminShell } from '@/components/admin/admin-shell'
import { RestaurantProvider } from '@/components/admin/restaurant-context'
import { getRestaurantBySlug, type AdminRestaurant } from '@/lib/data/admin-restaurant'
import { Toaster } from '@/components/ui/sonner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
      <AdminShell restaurantSlug={restaurant.slug} restaurantName={restaurant.name}>
        {children}
      </AdminShell>
      <Toaster />
    </RestaurantProvider>
  )
}
