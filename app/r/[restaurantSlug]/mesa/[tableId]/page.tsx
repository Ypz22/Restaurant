'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { Armchair, TriangleAlert } from 'lucide-react'
import { NicknameForm } from '@/components/nickname-form'
import { getTableByQrToken, type TableInfo } from '@/lib/data/table'
import { startSession } from '@/lib/data/session'
import { saveDeviceToken } from '@/lib/session/device-token'

function WelcomeCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-md lg:p-8">{children}</section>
    </main>
  )
}

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
        const info = await getTableByQrToken(params.tableId)
        if (active) setTable(info && info.restaurantSlug === params.restaurantSlug ? info : null)
      } catch { if (active) setError('No se pudo conectar a la mesa. Comprueba tu conexión.') }
      finally { if (active) setChecking(false) }
    }
    init()
    return () => { active = false }
  }, [params.tableId, params.restaurantSlug])

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

  if (checking) {
    return <WelcomeCard><p className="text-body-lg text-muted-foreground">Cargando mesa…</p></WelcomeCard>
  }

  if (!table) {
    return (
      <WelcomeCard>
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-body-md text-danger-soft-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error || 'Mesa no encontrada. Verifica el código QR.'}
        </p>
      </WelcomeCard>
    )
  }

  if (table.availability === 'unavailable') {
    return (
      <WelcomeCard>
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-label-md text-secondary-foreground">
          <Armchair className="size-4" aria-hidden="true" /> {table.restaurantName}
        </span>
        <h1 className="mt-3 font-serif text-title-lg text-foreground">{table.tableLabel}</h1>
        <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-body-md text-danger-soft-foreground">
          Esta mesa no está disponible en este momento. Pide ayuda al personal.
        </p>
      </WelcomeCard>
    )
  }

  return (
    <WelcomeCard>
      <div className="-mx-6 -mt-6 mb-5 overflow-hidden rounded-t-2xl lg:-mx-8 lg:-mt-8">
        <Image src="/brasa/365a2f7b9a.png" alt="Costillar a la brasa" width={700} height={280} unoptimized className="aspect-[5/2] w-full object-cover" />
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-label-md text-secondary-foreground">
        <Armchair className="size-4" aria-hidden="true" /> Bienvenido a {table.restaurantName}
      </span>
      <h1 className="mt-3 font-serif text-display-lg text-foreground">{table.tableLabel}</h1>
      <p className="mt-2 text-body-lg text-muted-foreground">
        Explora el menú y pide desde tu mesa. Escribe tu apodo para unirte a la orden compartida.
      </p>
      <div className="mt-6">
        <NicknameForm onSubmit={handleSubmit} disabled={submitting} />
      </div>
      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-body-md text-danger-soft-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </WelcomeCard>
  )
}
