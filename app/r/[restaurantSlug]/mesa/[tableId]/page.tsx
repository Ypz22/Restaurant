'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { NicknameForm } from '@/components/nickname-form'
import { getTableByQrToken, type TableInfo } from '@/lib/data/table'
import { startSession, resumeSession } from '@/lib/data/session'
import { getDeviceToken, saveDeviceToken, clearDeviceToken } from '@/lib/session/device-token'
import Image from 'next/image'
import '@/components/brasa/live.css'

export default function BienvenidaPage() {
  const router = useRouter()
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const [table, setTable] = useState<TableInfo | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    async function init() {
      try {
        const existingToken = getDeviceToken()
        if (existingToken) {
          const resumed = await resumeSession(existingToken)
        // Only resume when the session is open AND it belongs to the table
        // this QR/URL actually points at. A stale device_token from a
        // previous visit to a different table (or restaurant) must not
        // silently resume the customer into the wrong session.
          if (resumed && resumed.sessionStatus === 'open' && resumed.qrToken === params.tableId) {
          router.replace(`/r/${resumed.restaurantSlug}/mesa/${params.tableId}/menu`)
          return
          }
          clearDeviceToken()
        }

        const info = await getTableByQrToken(params.tableId)
        if (active) setTable(info)
      } catch { if (active) setError('No se pudo conectar a la mesa. Comprueba tu conexión.') }
      finally { if (active) setChecking(false) }
    }
    init()
    return () => { active = false }
  }, [params.tableId, router])

  async function handleSubmit(nickname: string) {
    setError(null)
    setSubmitting(true)
    try {
      const session = await startSession(params.tableId, nickname)
      saveDeviceToken(session.deviceToken)
      router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)
    } catch (err) {
      if (err instanceof Error && err.message.includes('table_unavailable')) {
        setTable((current) => (current ? { ...current, availability: 'unavailable' } : current))
      } else {
        setError('No se pudo unir a la mesa, intenta de nuevo.')
      }
      setSubmitting(false)
    }
  }

  if (checking) return <main className="sb-login"><p>Cargando mesa…</p></main>
  if (!table) return <main className="sb-login"><p role="alert">{error || 'Mesa no encontrada. Verifica el código QR.'}</p></main>

  if (table.availability === 'unavailable') {
    return (
      <main className="sb-login"><section className="sb-login-card">
        <span className="sb-eyebrow">{table.restaurantName.toUpperCase()}</span><h1>{table.tableLabel}</h1>
        <p role="alert">Esta mesa no está disponible en este momento. Pide ayuda al personal.</p>
      </section></main>
    )
  }

  return (
    <main className="sb-login"><section className="sb-login-card"><div className="sb-login-photo"><Image src="/brasa/365a2f7b9a.png" alt="Costillar a la brasa" width={700} height={280} unoptimized /></div>
      <span className="sb-eyebrow">BIENVENIDO A {table.restaurantName.toUpperCase()}</span><h1>{table.tableLabel}</h1><p>Explora el menú y pide desde tu mesa. Escribe tu apodo para unirte a la orden compartida.</p>
      <NicknameForm onSubmit={handleSubmit} disabled={submitting} />
      {error && <div className="sb-alert" role="alert">{error}</div>}
    </section></main>
  )
}
