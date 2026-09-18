'use client'

import type { ReactNode } from 'react'
import { ClientHeaderNav, type ClientNavId } from '@/components/client-header-nav'

/** Envoltorio compartido de las pantallas del comensal: header + nav + lienzo con tokens. */
export function ClientShell({ children, base, restaurantName, tableLabel, active, count = 0 }: {
  children: ReactNode; base: string; restaurantName: string; tableLabel: string
  active: ClientNavId; count?: number
}) {
  return (
    <div className="min-h-dvh bg-background font-sans text-foreground pb-24 lg:pb-0">
      <ClientHeaderNav base={base} restaurantName={restaurantName} tableLabel={tableLabel} active={active} count={count} />
      <main className="mx-auto max-w-screen-sm px-4 py-4 lg:max-w-6xl lg:py-6">{children}</main>
    </div>
  )
}
