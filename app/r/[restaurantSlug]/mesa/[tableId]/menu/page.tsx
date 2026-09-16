'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { BrasaShell } from '@/components/brasa/shell'
import { getMenu, type MenuCategory, type MenuDish } from '@/lib/data/menu'
import { getTableByQrToken } from '@/lib/data/table'
import { getDeviceToken } from '@/lib/session/device-token'
import { resumeSession } from '@/lib/data/session'
import { createTableRequest } from '@/lib/data/requests'
import { useDishAvailabilityRealtime } from '@/hooks/use-dish-availability-realtime'
import { useCartRealtime } from '@/hooks/use-cart-realtime'

const reasons = ['Pedir la cuenta', 'Llamar al camarero', 'Agua', 'Cubiertos o vajilla', 'Servilletas', 'Consultar alergias', 'Retirar platos', 'Otra indicación']

function LiveMenu() {
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const router = useRouter()
  const search = useSearchParams()
  const view = search.get('vista')
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [initialDishes, setInitialDishes] = useState<MenuDish[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string>('')
  const [query, setQuery] = useState('')
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const [tableSessionId, setTableSessionId] = useState<string | null>(null)
  const [tableLabel, setTableLabel] = useState('Tu mesa')
  const [favorites, setFavorites] = useState<string[]>([])
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
        if (!session || session.sessionStatus !== 'open' || session.qrToken !== params.tableId) {
          router.replace(base)
          return
        }
        const table = await getTableByQrToken(params.tableId)
        if (!table) throw new Error('Mesa no encontrada')
        const menu = await getMenu(table.restaurantId)
        setCategories(menu.categories)
        setRestaurantId(table.restaurantId)
        setInitialDishes(menu.dishes)
        setTableLabel(table.tableLabel)
        setTableSessionId(session.tableSessionId)
        setDeviceToken(token)
        try { setFavorites(JSON.parse(localStorage.getItem('brasa:favorites') || '[]')) } catch { setFavorites([]) }
      } catch { setError('No se pudo cargar el menú. Comprueba tu conexión e intenta de nuevo.') }
      finally { setLoading(false) }
    }
    load()
  }, [params.tableId, router, base])

  const visibleDishes = useMemo(() => dishes.filter(d => {
    const matchesQuery = !query.trim() || `${d.name} ${d.description}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesQuery && (activeCategoryId === '' || d.categoryId === activeCategoryId) && (view !== 'favoritos' || favorites.includes(d.id))
  }), [dishes, query, activeCategoryId, view, favorites])
  const hero = dishes.find(d => d.name === 'Costillar al Quebracho' && d.isAvailable)

  function toggleFavorite(id: string) {
    setFavorites(current => {
      const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id]
      localStorage.setItem('brasa:favorites', JSON.stringify(next))
      return next
    })
  }

  async function sendRequest() {
    if (!deviceToken) return
    setError(null); setSending(true); setSent(false)
    try { await createTableRequest(deviceToken, reason === 'Agua' ? 'agua' : 'llamar_mesero', reason, notes.trim()); setSent(true); setNotes('') }
    catch { setError('No se pudo enviar el aviso. Inténtalo de nuevo.') }
    finally { setSending(false) }
  }

  return (
    <BrasaShell slug={params.restaurantSlug} tableId={params.tableId} tableLabel={tableLabel} active={view === 'camarero' ? 'camarero' : view === 'favoritos' ? 'favoritos' : 'menu'} count={count}><main className="sb-main">
      {loading ? <p className="sb-subtitle">Cargando menú…</p> : error && !restaurantId ? <div className="sb-alert" role="alert">{error}</div> : view === 'camarero' ? <section className="sb-panel">
        <span className="sb-eyebrow">ASISTENCIA EN MESA</span><h1 className="sb-title">¿En qué podemos ayudarte?</h1><p className="sb-subtitle">Tu aviso llegará al equipo de sala de {tableLabel}.</p>
        <div className="sb-help-grid">{reasons.map(option => <button key={option} className={reason === option ? 'active' : ''} onClick={() => { setReason(option); setSent(false) }}>{option}</button>)}</div>
        <label className="sb-label" htmlFor="request-notes">Detalle adicional (opcional)</label><textarea id="request-notes" className="sb-textarea" value={notes} onChange={event => setNotes(event.target.value)} maxLength={140} rows={4} placeholder="Cuéntanos qué necesitas…" />
        {error && <div className="sb-alert" role="alert">{error}</div>}{sent && <p className="sb-confirm-status" role="status">✓ Aviso enviado. El equipo de sala recibió tu solicitud: {reason}.</p>}
        <div className="sb-inline-actions"><button className="sb-primary" disabled={sending} onClick={sendRequest}>{sending ? 'Enviando…' : 'Solicitar a sala'}</button><button className="sb-secondary" onClick={() => router.push(`${base}/menu`)}>Volver al menú</button></div>
      </section> : <>
        <span className="sb-eyebrow">{tableLabel} · MENÚ INTERACTIVO</span><h1 className="sb-title">El sabor nace en la brasa.</h1><p className="sb-subtitle">Elige tus platos; cada comensal puede agregar a la orden compartida de la mesa.</p>
        {hero && view !== 'favoritos' && !query && <section className="sb-hero"><div className="sb-hero-photo"><Image src={hero.photoUrl || '/brasa/hero.png'} alt={hero.name} fill sizes="(max-width: 600px) 100vw, 55vw" unoptimized /></div><div className="sb-hero-copy"><span className="sb-eyebrow">ESPECIALIDAD DE LA CASA</span><h2>{hero.name}</h2><p>{hero.description}</p><div className="sb-hero-bottom"><strong>${hero.price.toFixed(2)}</strong><button className="sb-primary" onClick={() => router.push(`${base}/menu/${hero.id}`)}>Ver plato</button></div></div></section>}
        <div className="sb-inline-actions"><button className={view === 'favoritos' ? 'sb-primary' : 'sb-secondary'} onClick={() => router.push(`${base}/menu?vista=favoritos`)}>♡ Favoritos</button>{view === 'favoritos' && <button className="sb-secondary" onClick={() => router.push(`${base}/menu`)}>Ver todo</button>}</div>
        <div className="sb-search"><input aria-label="Buscar platos" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar un plato o ingrediente…" /></div>
        <div className="sb-chips" aria-label="Categorías del menú"><button className={activeCategoryId === '' ? 'active' : ''} onClick={() => setActiveCategoryId('')}>Todos</button>{categories.map(category => <button key={category.id} className={activeCategoryId === category.id ? 'active' : ''} onClick={() => setActiveCategoryId(category.id)}>{category.name}</button>)}</div>
        <div className="sb-grid">{visibleDishes.map(dish => <article key={dish.id} className={`sb-card ${dish.isAvailable ? '' : 'sb-card-unavailable'}`}><div className="sb-card-photo">{dish.photoUrl ? <Image src={dish.photoUrl} alt={dish.name} fill sizes="(max-width: 600px) 36vw, (max-width: 850px) 50vw, 33vw" unoptimized /> : <div className="sb-empty">Sin fotografía</div>}<button className="sb-favorite" aria-label={`${favorites.includes(dish.id) ? 'Quitar' : 'Guardar'} ${dish.name} de favoritos`} onClick={() => toggleFavorite(dish.id)}>{favorites.includes(dish.id) ? '♥' : '♡'}</button></div><div className="sb-card-body"><h3><button onClick={() => dish.isAvailable && router.push(`${base}/menu/${dish.id}`)} disabled={!dish.isAvailable}>{dish.name}</button></h3><p>{dish.description}</p><div className="sb-card-foot"><strong>${dish.price.toFixed(2)}</strong>{dish.isAvailable ? <button onClick={() => router.push(`${base}/menu/${dish.id}`)}>Ver plato →</button> : <span>No disponible</span>}</div></div></article>)}</div>
        {visibleDishes.length === 0 && <p className="sb-subtitle">No hay platos que coincidan con tu selección.</p>}
      </>}
    </main></BrasaShell>
  )
}

export default function MenuPage() { return <Suspense fallback={<div className="sb-app"><main className="sb-main">Cargando menú…</main></div>}><LiveMenu /></Suspense> }
