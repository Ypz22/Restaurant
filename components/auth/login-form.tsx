'use client'

import { useActionState } from 'react'
import { login, type ActionState } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const initialState: ActionState = { error: null }

export function LoginForm({ next }: { next: string | null }) {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-label-md text-foreground">Correo</label>
        <Input id="email" name="email" type="email" autoComplete="email" required disabled={pending} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-label-md text-foreground">Contraseña</label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required disabled={pending} />
      </div>
      {state.error && <p className="text-label-md text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Ingresando…' : 'Ingresar'}
      </Button>
    </form>
  )
}
