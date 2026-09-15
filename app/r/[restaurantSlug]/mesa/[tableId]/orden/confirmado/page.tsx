'use client'

import { useParams, useRouter } from 'next/navigation'

export default function PedidoConfirmadoPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const router = useRouter()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-headline-md text-onSurface">¡Pedido enviado!</h1>
      <p className="text-body-lg text-onSurface/70">
        La cocina ya recibió tu ronda. Puedes seguir agregando platos para la próxima ronda.
      </p>
      <button
        onClick={() => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)}
        className="rounded-md bg-primary px-6 py-3 font-semibold text-onPrimary"
      >
        Seguir pidiendo
      </button>
    </main>
  )
}
