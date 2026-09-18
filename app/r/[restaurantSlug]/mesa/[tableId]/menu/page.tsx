'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Flame, Search, ShoppingBag, TriangleAlert } from 'lucide-react'
import { ClientShell } from '@/components/client-shell'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getMenu, type MenuCategory, type MenuDish } from '@/lib/data/menu'
import { getTableByQrToken } from '@/lib/data/table'
import { getDeviceToken } from '@/lib/session/device-token'
import { resumeSession } from '@/lib/data/session'
import { createTableRequest } from '@/lib/data/requests'
import { useDishAvailabilityRealtime } from '@/hooks/use-dish-availability-realtime'
import { useCartRealtime } from '@/hooks/use-cart-realtime'

const reasons = ['Pedir la cuenta', 'Llamar al camarero', 'Agua', 'Cubiertos o vajilla', 'Servilletas', 'Consultar alergias', 'Retirar platos', 'Otra indicación']

function DishCard({ dish, onOpen }: { dish: MenuDish; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!dish.isAvailable}
      className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm disabled:opacity-60"
    >
      <div className="min-w-0 flex-1">
        <span role="heading" aria-level={3} className="block text-title-md text-foreground">{dish.name}</span>
        <p className="mt-0.5 line-clamp-2 text-body-md text-muted-foreground">{dish.description}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-title-md tabular-nums text-primary">${dish.price.toFixed(2)}</span>
          {!dish.isAvailable && <span className="rounded-full bg-muted px-2 py-0.5 text-label-sm uppercase text-muted-foreground">Agotado</span>}
        </div>
      </div>
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        {dish.photoUrl
          ? <Image src={dish.photoUrl} alt={dish.name} fill sizes="96px" unoptimized className={dish.isAvailable ? 'object-cover' : 'object-cover grayscale'} />
          : <div className="flex size-full items-center justify-center text-muted-foreground"><ShoppingBag className="size-6" /></div>}
      </div>
    </button>
  )
}

function LiveMenu() {
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const router = useRouter()
  const search = useSearchParams()
  const view = search.get('vista')
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState('Menú del restaurante')
  const [initialDishes, setInitialDishes] = useState<MenuDish[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string>('')
  const [query, setQuery] = useState('')
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const [tableSessionId, setTableSessionId] = useState<string | null>(null)
  const [tableLabel, setTableLabel] = useState('Tu mesa')
  const [reason, setReason] = useState(reasons[0])
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const dishes = useDishAvailabilityRealtime(restaurantId, initialDishes)
  const { items } = useCartRealtime({ tableSessionId, deviceToken })
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  const base = `/r/${params.restaurantSlug}/mesa/${params.tableId}`

  useEffect(() => {
    async function load() {
      try {
        const token = getDeviceToken()
        const session = token ? await resumeSession(token) : null
        if (
          !session || session.sessionStatus !== 'open' || session.qrToken !== params.tableId
          || session.restaurantSlug !== params.restaurantSlug
        ) {
          router.replace(base)
          return
        }
        const table = await getTableByQrToken(params.tableId)
        if (!table || table.restaurantSlug !== params.restaurantSlug) throw new Error('Mesa no encontrada')
        const menu = await getMenu(table.restaurantId)
        setCategories(menu.categories)
        setRestaurantId(table.restaurantId)
        setRestaurantName(table.restaurantName)
        setInitialDishes(menu.dishes)
        setTableLabel(table.tableLabel)
        setTableSessionId(session.tableSessionId)
        setDeviceToken(token)
      } catch { setError('No se pudo cargar el menú. Comprueba tu conexión e intenta de nuevo.') }
      finally { setLoading(false) }
    }
    load()
  }, [params.tableId, router, base, params.restaurantSlug])

  const visibleDishes = useMemo(() => dishes.filter(d => {
    const matchesQuery = !query.trim() || `${d.name} ${d.description}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesQuery && (activeCategoryId === '' || d.categoryId === activeCategoryId)
  }), [dishes, query, activeCategoryId])
  const hero = dishes.find(d => d.name === 'Costillar al Quebracho' && d.isAvailable)

  async function sendRequest() {
    if (!deviceToken) return
    setError(null); setSending(true); setSent(false)
    try { await createTableRequest(deviceToken, reason === 'Agua' ? 'agua' : 'llamar_mesero', reason, notes.trim()); setSent(true); setNotes('') }
    catch { setError('No se pudo enviar el aviso. Inténtalo de nuevo.') }
    finally { setSending(false) }
  }

  if (loading) {
    return (
      <ClientShell base={base} restaurantName={restaurantName} tableLabel={tableLabel} active="menu" count={count}>
        <p className="py-8 text-center text-body-lg text-muted-foreground">Cargando menú…</p>
      </ClientShell>
    )
  }

  if (error && !restaurantId) {
    return (
      <ClientShell base={base} restaurantName={restaurantName} tableLabel={tableLabel} active="menu" count={count}>
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-body-md text-danger-soft-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      </ClientShell>
    )
  }

  if (view === 'camarero') {
    return (
      <ClientShell base={base} restaurantName={restaurantName} tableLabel={tableLabel} active="camarero" count={count}>
        <span className="text-label-sm uppercase text-muted-foreground">Asistencia en mesa</span>
        <h1 className="mt-1 text-headline-lg text-foreground">¿En qué podemos ayudarte?</h1>
        <p className="mt-1 text-body-lg text-muted-foreground">Tu aviso llegará al equipo de sala de {tableLabel}.</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {reasons.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => { setReason(option); setSent(false) }}
              className={`min-h-11 rounded-2xl border p-3 text-left text-label-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${reason === option ? 'border-primary bg-secondary text-secondary-foreground ring-2 ring-primary' : 'border-border bg-card text-foreground hover:bg-muted'}`}
            >
              {option}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-label-md text-muted-foreground" htmlFor="request-notes">Detalle adicional (opcional)</label>
        <Textarea id="request-notes" className="mt-2 rounded-2xl bg-muted" value={notes} onChange={event => setNotes(event.target.value)} maxLength={140} rows={4} placeholder="Cuéntanos qué necesitas…" />

        {error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-body-md text-danger-soft-foreground">{error}</p>}
        {sent && <p role="status" className="mt-4 text-body-md font-semibold text-success-soft-foreground">✓ Aviso enviado. El equipo de sala recibió tu solicitud: {reason}.</p>}

        <div className="mt-5 flex flex-wrap gap-3">
          <Button disabled={sending} onClick={sendRequest}>{sending ? 'Enviando…' : 'Solicitar a sala'}</Button>
          <Button variant="secondary" onClick={() => router.push(`${base}/menu`)}>Volver al menú</Button>
        </div>
      </ClientShell>
    )
  }

  return (
    <ClientShell base={base} restaurantName={restaurantName} tableLabel={tableLabel} active="menu" count={count}>
      <span className="text-label-sm uppercase text-muted-foreground">{tableLabel} · Menú interactivo</span>
      <h1 className="mt-1 font-serif text-display-lg text-foreground">El sabor nace en la brasa.</h1>
      <p className="mt-1 text-body-lg text-muted-foreground">Elige tus platos; cada comensal puede agregar a la orden compartida de la mesa.</p>

      {hero && !query && (
        <section className="relative mt-5 h-48 overflow-hidden rounded-2xl">
          <Image src={hero.photoUrl || '/brasa/hero.png'} alt={hero.name} fill sizes="(max-width: 600px) 100vw, 640px" unoptimized className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-highlight px-2 py-1 text-label-sm uppercase text-highlight-foreground"><Flame className="size-3.5" aria-hidden="true" /> Sugerencia del chef</span>
              <h2 className="mt-1.5 font-serif text-title-lg text-white">{hero.name}</h2>
              <p className="text-headline-md tabular-nums text-white">${hero.price.toFixed(2)}</p>
            </div>
            <Button size="sm" onClick={() => router.push(`${base}/menu/${hero.id}`)}>Ver plato</Button>
          </div>
        </section>
      )}

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          aria-label="Buscar platos"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Buscar un plato o ingrediente…"
          className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-body-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Categorías del menú">
        <button
          type="button"
          onClick={() => setActiveCategoryId('')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-label-md ${activeCategoryId === '' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          Todos
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategoryId(category.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-label-md ${activeCategoryId === category.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {visibleDishes.map(dish => (
          <DishCard key={dish.id} dish={dish} onOpen={() => dish.isAvailable && router.push(`${base}/menu/${dish.id}`)} />
        ))}
        {visibleDishes.length === 0 && <p className="py-8 text-center text-body-md text-muted-foreground">No hay platos que coincidan con tu selección.</p>}
      </div>
    </ClientShell>
  )
}

export default function MenuPage() {
  return <Suspense fallback={<main className="flex min-h-dvh items-center justify-center bg-background"><p className="text-body-lg text-muted-foreground">Cargando menú…</p></main>}><LiveMenu /></Suspense>
}
