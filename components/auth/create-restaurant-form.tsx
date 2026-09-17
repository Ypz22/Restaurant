'use client'

import { useActionState, useState } from 'react'
import { Copy } from 'lucide-react'
import { createRestaurant, type CreateRestaurantState } from '@/lib/auth/platform-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const THEMES = [
  { value: 'brasa', label: 'Brasa' },
  { value: 'mar', label: 'Mar' },
  { value: 'cafe', label: 'Café' },
  { value: 'huerta', label: 'Huerta' },
]

const initialState: CreateRestaurantState = { error: null }

export function CreateRestaurantForm() {
  const [state, formAction, pending] = useActionState(createRestaurant, initialState)
  const [copied, setCopied] = useState(false)

  if (state.temporaryPassword) {
    return (
      <div className="mt-4 rounded-xl border border-border bg-muted p-4">
        <p className="text-label-md text-foreground">Restaurante creado. Contraseña temporal del admin:</p>
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
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-label-md text-foreground">Nombre</label>
        <Input id="name" name="name" required disabled={pending} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="slug" className="text-label-md text-foreground">Identificador (URL)</label>
        <Input id="slug" name="slug" required disabled={pending} placeholder="sabor-brasa" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="theme" className="text-label-md text-foreground">Tema</label>
        <select
          id="theme"
          name="theme"
          required
          disabled={pending}
          defaultValue=""
          className="h-11 rounded-xl border border-input bg-background px-3 text-body-md text-foreground"
        >
          <option value="" disabled>Elegí un tema</option>
          {THEMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="adminEmail" className="text-label-md text-foreground">Correo del primer administrador</label>
        <Input id="adminEmail" name="adminEmail" type="email" required disabled={pending} />
      </div>
      {state.error && <p className="text-label-md text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Creando…' : 'Crear restaurante'}
      </Button>
    </form>
  )
}
