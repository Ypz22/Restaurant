'use client'

import { useActionState } from 'react'
import { completePasswordChange, type ActionState } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const initialState: ActionState = { error: null }

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(completePasswordChange, initialState)

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-label-md text-foreground">Nueva contraseña</label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} disabled={pending} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-label-md text-foreground">Repetí la contraseña</label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} disabled={pending} />
      </div>
      {state.error && <p className="text-label-md text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Guardando…' : 'Guardar y continuar'}
      </Button>
    </form>
  )
}
