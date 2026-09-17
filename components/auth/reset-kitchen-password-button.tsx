'use client'

import { useActionState, useState } from 'react'
import { Copy } from 'lucide-react'
import { resetKitchenStaffPassword, type ResetPasswordState } from '@/lib/auth/staff-actions'
import { Button } from '@/components/ui/button'

const initialState: ResetPasswordState = { error: null }

export function ResetKitchenPasswordButton({ userId, restaurantSlug }: { userId: string; restaurantSlug: string }) {
  const [state, formAction, pending] = useActionState(resetKitchenStaffPassword.bind(null, restaurantSlug), initialState)
  const [copied, setCopied] = useState(false)

  if (state.temporaryPassword) {
    return (
      <div className="flex items-center gap-2">
        <code className="rounded-lg bg-card px-2 py-1 text-label-md tabular-nums text-foreground">
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
        {copied && <span className="text-label-sm text-muted-foreground">Copiada</span>}
      </div>
    )
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? 'Generando…' : 'Restablecer contraseña'}
      </Button>
    </form>
  )
}
