'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DishDetail } from '@/components/dish-detail'
import { DishDetailShell } from '@/components/dish-detail-shell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getTableByQrToken } from '@/lib/data/table'
import { getMenu, type MenuDish } from '@/lib/data/menu'
import { getDeviceToken } from '@/lib/session/device-token'
import { addCartItem } from '@/lib/data/cart'
import { resumeSession } from '@/lib/data/session'
import type { DishSelections } from '@/lib/dish-details'
import { useCartRealtime } from '@/hooks/use-cart-realtime'
import { useDishAvailabilityRealtime } from '@/hooks/use-dish-availability-realtime'

export default function DishDetailPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string; dishId: string }>()
  const router = useRouter()
  const [initialDishes, setInitialDishes] = useState<MenuDish[]>([])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const [tableSessionId, setTableSessionId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState('Menú del restaurante')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [tableLabel, setTableLabel] = useState('Tu mesa')
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [retry, setRetry] = useState(0)
  const dishes = useDishAvailabilityRealtime(restaurantId, initialDishes)
  const dish = dishes.find(d => d.id === params.dishId)
  const { items } = useCartRealtime({ tableSessionId, deviceToken })
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  const base = `/r/${params.restaurantSlug}/mesa/${params.tableId}`

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const token = getDeviceToken()
        const session = token ? await resumeSession(token) : null
        if (!session || session.sessionStatus !== 'open' || session.qrToken !== params.tableId || session.restaurantSlug !== params.restaurantSlug) {
          router.replace(base)
          return
        }
        const table = await getTableByQrToken(params.tableId)
        if (!table) throw new Error('Mesa no encontrada')
        const menu = await getMenu(table.restaurantId)
        if (cancelled) return
        setRestaurantId(table.restaurantId)
        setRestaurantName(table.restaurantName)
        setTableLabel(table.tableLabel)
        setInitialDishes(menu.dishes)
        setDeviceToken(token)
        setTableSessionId(session.tableSessionId)
      } catch { if (!cancelled) setError('No se pudo cargar el plato. Comprueba tu conexión e inténtalo de nuevo.') }
      finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [params.tableId, params.dishId, params.restaurantSlug, router, base, retry])

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  async function handleAdd(quantity: number, notes: string, selections: DishSelections) {
    if (!deviceToken || !dish) { router.replace(base); return }
    setError(null)
    setAdding(true)
    try {
      await addCartItem(deviceToken, dish.id, quantity, notes, selections)
      router.push(`${base}/orden`)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : ''
      setError(message.includes('required_') ? 'Completa las opciones obligatorias del plato.' : message.includes('invalid_selections') ? 'Las opciones del plato cambiaron. Recarga el detalle antes de pedir.' : message.includes('dish_unavailable') ? 'Este plato acaba de agotarse. Elige otro plato del menú.' : 'No se pudo agregar el plato. Comprueba tu conexión e inténtalo de nuevo.')
      setAdding(false)
    }
  }

  return <DishDetailShell base={base} restaurantName={restaurantName} tableLabel={tableLabel} count={count}>
    {offline && <p role="status" className="mb-4 rounded-xl bg-warning-soft p-3 text-body-md text-warning-soft-foreground">Sin conexión. Reconéctate antes de agregar el plato.</p>}
    {loading ? <div className="space-y-4 pb-32" aria-label="Cargando plato"><Skeleton className="aspect-[4/3] w-full rounded-2xl" /><Skeleton className="h-6 w-3/4" /><Skeleton className="h-16 w-full" /><Skeleton className="h-24 w-full" /></div> : dish ? <DishDetail key={dish.id} dish={dish} onAdd={handleAdd} adding={adding} offline={offline} error={error} /> : <div className="space-y-4 py-12 text-body-md">{error ? <p role="alert" className="rounded-xl bg-danger-soft p-3 text-danger-soft-foreground">{error}</p> : <p>Este plato no se encuentra en el menú.</p>}<Button variant="secondary" onClick={() => error ? setRetry(n => n + 1) : router.push(`${base}/menu`)}>{error ? 'Reintentar' : 'Volver al menú'}</Button></div>}
  </DishDetailShell>
}
