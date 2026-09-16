'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAdminRestaurant } from '@/components/admin/restaurant-context'
import { getPendingRequests, acknowledgeRequest, requestLabel, type PendingRequest } from '@/lib/data/admin-tables'
import { usePolling } from '@/hooks/use-polling'

type RequestsState = {
  requests: PendingRequest[]
  offline: boolean
  acknowledge: (request: PendingRequest) => Promise<void>
}

const REQUEST_TOAST_MS = 6_000

const RequestsContext = createContext<RequestsState | null>(null)

export function useTableRequests() {
  const value = useContext(RequestsContext)
  if (!value) throw new Error('useTableRequests debe usarse dentro de RequestsProvider')
  return value
}

/** Tono corto con Web Audio. El navegador solo lo permite tras una interacción del usuario. */
function useChime() {
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const unlock = () => {
      ctxRef.current ??= new AudioContext()
      void ctxRef.current.resume()
    }
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  return () => {
    const ctx = ctxRef.current
    if (!ctx || ctx.state !== 'running') return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)
  }
}

export function RequestsProvider({ children }: { children: ReactNode }) {
  const restaurant = useAdminRestaurant()
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [offline, setOffline] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const knownIds = useRef<Set<string> | null>(null)
  const acknowledging = useRef(new Set<string>())
  const chime = useChime()

  usePolling(async () => {
    try {
      const fresh = (await getPendingRequests(restaurant.id)).filter((r) => !acknowledging.current.has(r.id))
      const newOnes = knownIds.current ? fresh.filter((r) => !knownIds.current!.has(r.id)) : []
      knownIds.current = new Set(fresh.map((r) => r.id))
      if (newOnes.length > 0) chime()
      const mesasHref = `/admin/${restaurant.slug}/mesas`
      for (const request of newOnes) {
        toast(`${request.tableLabel} · ${requestLabel(request)}`, {
          id: request.id,
          description: request.notes || undefined,
          duration: REQUEST_TOAST_MS,
          action: pathname?.startsWith(mesasHref)
            ? undefined
            : { label: 'Ver mesas', onClick: () => router.push(mesasHref) },
        })
      }
      setRequests(fresh)
      setOffline(false)
    } catch {
      setOffline(true)
    }
  }, undefined, restaurant.id)

  async function acknowledge(request: PendingRequest) {
    acknowledging.current.add(request.id)
    setRequests((current) => current.filter((r) => r.id !== request.id))
    try {
      await acknowledgeRequest(restaurant.id, request.id)
    } catch {
      toast.error('No se pudo marcar la solicitud como atendida.')
      setRequests((current) =>
        [...current, request].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      )
    } finally {
      acknowledging.current.delete(request.id)
    }
  }

  return (
    <RequestsContext.Provider value={{ requests, offline, acknowledge }}>
      {children}
    </RequestsContext.Provider>
  )
}
