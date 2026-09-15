'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { NicknameForm } from '@/components/nickname-form'
import { getTableByQrToken, type TableInfo } from '@/lib/data/table'
import { startSession, resumeSession } from '@/lib/data/session'
import { getDeviceToken, saveDeviceToken, clearDeviceToken } from '@/lib/session/device-token'

export default function BienvenidaPage() {
  const router = useRouter()
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const [table, setTable] = useState<TableInfo | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function init() {
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
      setTable(info)
      setChecking(false)
    }
    init()
  }, [params.tableId, router])

  async function handleSubmit(nickname: string) {
    setError(null)
    setSubmitting(true)
    try {
      const session = await startSession(params.tableId, nickname)
      saveDeviceToken(session.deviceToken)
      router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)
    } catch {
      setError('No se pudo unir a la mesa, intenta de nuevo.')
      setSubmitting(false)
    }
  }

  if (checking) return null
  if (!table) return <p className="p-6">Mesa no encontrada. Verifica el código QR.</p>

  return (
    <main className="flex min-h-screen flex-col justify-center gap-6 bg-background p-6">
      <div>
        <p className="text-label-md uppercase text-secondary">{table.restaurantName}</p>
        <h1 className="text-headline-md text-onSurface">{table.tableLabel}</h1>
      </div>
      <NicknameForm onSubmit={handleSubmit} disabled={submitting} />
      {error && <p className="text-primary">{error}</p>}
    </main>
  )
}
