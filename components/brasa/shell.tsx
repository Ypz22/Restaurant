'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import './live.css'

export function BrasaShell({ children, slug, tableId, tableLabel = 'Tu mesa', active, count = 0 }: {
  children: ReactNode; slug: string; tableId: string; tableLabel?: string
  active: 'menu' | 'favoritos' | 'orden' | 'camarero'; count?: number
}) {
  const router = useRouter()
  const base = `/r/${slug}/mesa/${tableId}`
  const links = [
    { id: 'menu', label: 'Menú', mark: '♨', href: `${base}/menu` },
    { id: 'favoritos', label: 'Favoritos', mark: '♡', href: `${base}/menu?vista=favoritos` },
    { id: 'orden', label: 'Mi orden', mark: '▣', href: `${base}/orden` },
    { id: 'camarero', label: 'Camarero', mark: '♧', href: `${base}/menu?vista=camarero` },
  ] as const
  return <div className="sb-app">
    <header className="sb-header"><div className="sb-header-inner">
      <button className="sb-brand" onClick={() => router.push(`${base}/menu`)} aria-label="Ir al menú de Sabor y Brasa"><Image src="/brasa/994099d9c9.png" alt="" width={44} height={44} unoptimized /><span><strong>Sabor & Brasa</strong><small>COCINA A LAS BRASAS</small></span></button>
      <div className="sb-header-right"><span className="sb-table">{tableLabel}</span><button className="sb-cart-link" onClick={() => router.push(`${base}/orden`)} aria-label={`Ver mi orden, ${count} platos`}>Mi orden {count > 0 && <b>{count}</b>}</button></div>
    </div></header>
    <nav className="sb-desktop-nav" aria-label="Navegación principal">{links.map(link => <button key={link.id} className={active === link.id ? 'active' : ''} onClick={() => router.push(link.href)}>{link.label}</button>)}</nav>
    {children}
    <nav className="sb-mobile-nav" aria-label="Navegación principal">{links.map(link => <button key={link.id} className={active === link.id ? 'active' : ''} onClick={() => router.push(link.href)}><span>{link.mark}</span><small>{link.label}{link.id === 'orden' && count > 0 ? ` · ${count}` : ''}</small></button>)}</nav>
  </div>
}
