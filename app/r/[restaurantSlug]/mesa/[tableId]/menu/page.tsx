'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CategoryTabs } from '@/components/category-tabs'
import { CallWaiterButton } from '@/components/call-waiter-button'
import { DishCard } from '@/components/dish-card'
import { DishSearchBar } from '@/components/dish-search-bar'
import { getMenu, type MenuCategory, type MenuDish } from '@/lib/data/menu'
import { getTableByQrToken } from '@/lib/data/table'
import { getDeviceToken } from '@/lib/session/device-token'

export default function MenuPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const router = useRouter()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [dishes, setDishes] = useState<MenuDish[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string>('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    async function load() {
      const table = await getTableByQrToken(params.tableId)
      if (!table) return
      const menu = await getMenu(table.restaurantId)
      setCategories(menu.categories)
      setDishes(menu.dishes)
      setActiveCategoryId(menu.categories[0]?.id ?? '')
    }
    load()
  }, [params.tableId])

  const visibleDishes = query.trim()
    ? dishes.filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase()))
    : dishes.filter((d) => d.categoryId === activeCategoryId)

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-background p-4">
      <DishSearchBar value={query} onChange={setQuery} />
      {!query.trim() && (
        <CategoryTabs categories={categories} activeId={activeCategoryId} onSelect={setActiveCategoryId} />
      )}
      <div className="flex flex-col gap-3">
        {visibleDishes.map((dish) => (
          <DishCard
            key={dish.id}
            dish={dish}
            onClick={(id) => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu/${id}`)}
          />
        ))}
      </div>
      {getDeviceToken() && <CallWaiterButton deviceToken={getDeviceToken()!} />}
    </main>
  )
}
