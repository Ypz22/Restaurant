'use client'

import { useActionState, useState } from 'react'
import { Copy } from 'lucide-react'
import { addKitchenStaff, type AddKitchenStaffState } from '@/lib/auth/staff-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const initialState: AddKitchenStaffState = { error: null }

export function AddKitchenStaffForm({ restaurantId, restaurantSlug }: { restaurantId: string; restaurantSlug: string }) {
  const [state, formAction, pending] = useActionState(
    addKitchenStaff.bind(null, restaurantId, restaurantSlug),
    initialState
  )
  const [copied, setCopied] = useState(false)

  if (state.temporaryPassword) {
    return (
      <div className="rounded-xl border border-border bg-muted p-4">
        <p className="text-label-md text-foreground">Cuenta creada. Contraseña temporal:</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-card px-3 py-2 text-body-md tabular-nums text-foreground">
            {state.temporaryPassword}
          </code>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(state.temporaryPassword!)
              setCopied(true)
            }}
          >
            <Copy className="size-4" />
          </Button>
        </div>
        <p className="mt-2 text-label-sm text-muted-foreground">
          {copied ? 'Copiada.' : 'Se muestra una sola vez: copiala antes de salir de esta pantalla.'}
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="email" className="text-label-md text-foreground">Correo de la nueva cuenta de cocina</label>
          <Input id="email" name="email" type="email" required disabled={pending} />
        </div>
        <Button type="submit" disabled={pending}>{pending ? 'Creando…' : 'Agregar'}</Button>
      </div>
      {state.error && <p className="text-label-md text-destructive">{state.error}</p>}
    </form>
  )
}
