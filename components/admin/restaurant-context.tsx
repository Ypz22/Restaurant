'use client'

import { createContext, useContext } from 'react'
import type { AdminRestaurant } from '@/lib/data/admin-restaurant'

const RestaurantContext = createContext<AdminRestaurant | null>(null)

export function RestaurantProvider({ restaurant, children }: { restaurant: AdminRestaurant; children: React.ReactNode }) {
  return <RestaurantContext.Provider value={restaurant}>{children}</RestaurantContext.Provider>
}

export function useAdminRestaurant(): AdminRestaurant {
  const restaurant = useContext(RestaurantContext)
  if (!restaurant) throw new Error('useAdminRestaurant must be used within RestaurantProvider')
  return restaurant
}
