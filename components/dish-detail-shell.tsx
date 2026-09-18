'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ClientShell } from '@/components/client-shell'

export function DishDetailShell({ children, base, restaurantName, tableLabel, count }: {
  children: ReactNode; base: string; restaurantName: string; tableLabel: string
  count: number
}) {
  return <ClientShell base={base} restaurantName={restaurantName} tableLabel={tableLabel} active="menu" count={count}>
    <div className="flex items-center justify-between py-2 lg:py-2">
      <Link href={`${base}/menu`} aria-label="Volver al menú" className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-5" /></Link>
      <span className="text-label-lg">Detalle del plato</span>
      <span className="size-11" aria-hidden="true" />
    </div>
    {children}
  </ClientShell>
}
