'use client'

import type { ReactNode } from 'react'
import { ClientHeaderNav } from '@/components/client-header-nav'
import './live.css'
import './contrast.css'

export function BrasaShell({ children, slug, tableId, tableLabel = 'Tu mesa', active, count = 0 }: {
  children: ReactNode; slug: string; tableId: string; tableLabel?: string
  active: 'menu' | 'favoritos' | 'orden' | 'camarero'; count?: number
}) {
  const base = `/r/${slug}/mesa/${tableId}`
  return <div className="sb-app pb-24 lg:pb-0">
    <ClientHeaderNav base={base} restaurantName="Sabor & Brasa" tableLabel={tableLabel} active={active} count={count} />
    {children}
  </div>
}
