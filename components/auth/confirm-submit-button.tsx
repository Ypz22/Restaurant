'use client'

import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'

// Botón de submit que pide confirmación antes de disparar el form action.
// Se usa para las operaciones destructivas/reversibles-a-medias del flujo de
// auth (suspender un restaurante, quitar una cuenta de cocina).
export function ConfirmSubmitButton({
  confirmMessage,
  children,
  ...props
}: ComponentProps<typeof Button> & { confirmMessage: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault()
      }}
    >
      {children}
    </Button>
  )
}
