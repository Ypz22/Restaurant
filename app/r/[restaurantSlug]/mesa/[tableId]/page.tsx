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

  useEffect(() => {
    async function init() {
      const existingToken = getDeviceToken()
      if (existingToken) {
        const resumed = await resumeSession(existingToken)
        if (resumed && resumed.sessionStatus === 'open') {
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
    const session = await startSession(params.tableId, nickname)
    saveDeviceToken(session.deviceToken)
    router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)
  }

  if (checking) return null
  if (!table) return <p className="p-6">Mesa no encontrada. Verifica el código QR.</p>

  return (
    <main className="flex min-h-screen flex-col justify-center gap-6 bg-background p-6">
      <div>
        <p className="text-label-md uppercase text-secondary">{table.restaurantName}</p>
        <h1 className="text-headline-md text-onSurface">{table.tableLabel}</h1>
      </div>
      <NicknameForm onSubmit={handleSubmit} />
    </main>
  )
}
