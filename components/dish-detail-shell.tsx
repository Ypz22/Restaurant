'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Armchair, ArrowLeft, BookOpen, ConciergeBell, Heart, ReceiptText, ShoppingBag } from 'lucide-react'

export function DishDetailShell({ children, base, restaurantName, tableLabel, favorite, onToggleFavorite, count }: {
  children: ReactNode; base: string; restaurantName: string; tableLabel: string
  favorite: boolean; onToggleFavorite: () => void; count: number
}) {
  const links = [
    { title: 'Menú', icon: BookOpen, href: `${base}/menu` },
    { title: 'Favoritos', icon: Heart, href: `${base}/menu?vista=favoritos` },
    { title: 'Mi orden', icon: ReceiptText, href: `${base}/orden` },
    { title: 'Camarero', icon: ConciergeBell, href: `${base}/menu?vista=camarero` },
  ]
  return <div className="min-h-dvh bg-background font-sans text-foreground">
    <header className="border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-screen-sm items-center justify-between gap-2 px-4 py-3 lg:max-w-6xl lg:py-4">
        <Link href={`${base}/menu`} className="flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Image src="/brasa/994099d9c9.png" alt="" width={32} height={32} className="size-8 shrink-0 object-contain" unoptimized /><span className="min-w-0"><span className="block truncate text-title-md">{restaurantName}</span><span className="block text-label-sm text-muted-foreground uppercase">Menú</span></span></Link>
        <div className="flex shrink-0 items-center gap-2"><span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-label-md text-secondary-foreground tabular-nums"><Armchair className="size-4" />{tableLabel}</span><Link href={`${base}/orden`} aria-label={`Ver mi orden, ${count} platos`} className="relative flex size-11 items-center justify-center rounded-xl hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ShoppingBag className="size-5" />{count > 0 && <span className="absolute right-0 top-0 rounded-full bg-primary px-1.5 text-label-sm text-primary-foreground tabular-nums">{count}</span>}</Link></div>
      </div>
    </header>
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:static lg:border-t-0 lg:border-b lg:bg-background lg:pb-0">
      <div className="mx-auto flex h-16 items-center justify-around lg:h-14 lg:max-w-6xl lg:justify-start lg:gap-2 lg:px-4">{links.map(({ title, icon: Icon, href }) => <Link key={title} href={href} className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl lg:min-w-32 lg:flex-none lg:flex-row lg:gap-2 lg:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${title === 'Menú' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}><Icon className="size-5" /><span className="text-label-sm">{title}{title === 'Mi orden' && count > 0 ? ` · ${count}` : ''}</span></Link>)}</div>
    </nav>
    <main className="mx-auto max-w-screen-sm px-4 lg:max-w-6xl">
      <div className="flex items-center justify-between py-2 lg:py-6">
        <Link href={`${base}/menu`} aria-label="Volver al menú" className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-5" /></Link>
        <span className="text-label-lg">Detalle del plato</span>
        <button type="button" aria-label={favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'} aria-pressed={favorite} className="flex size-11 items-center justify-center rounded-full bg-muted text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onToggleFavorite}><Heart className={`size-5 ${favorite ? 'fill-primary' : ''}`} /></button>
      </div>
      {children}
    </main>

  </div>
}
