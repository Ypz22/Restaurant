'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Armchair, BookOpen, ConciergeBell, ReceiptText } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'menu', title: 'Menú', icon: BookOpen },
  { id: 'orden', title: 'Mi orden', icon: ReceiptText },
  { id: 'camarero', title: 'Camarero', icon: ConciergeBell },
] as const

export type ClientNavId = typeof NAV_ITEMS[number]['id']

function navHref(base: string, id: ClientNavId) {
  if (id === 'orden') return `${base}/orden`
  if (id === 'camarero') return `${base}/menu?vista=camarero`
  return `${base}/menu`
}

/** Header y navegación del comensal: única fuente para menú, detalle y orden, evita que se desalineen. */
export function ClientHeaderNav({ base, restaurantName, tableLabel, active, count }: {
  base: string; restaurantName: string; tableLabel: string; active: ClientNavId; count: number
}) {
  return <>
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-screen-sm items-center justify-between gap-2 px-4 py-3 lg:h-16 lg:max-w-6xl lg:gap-6 lg:py-0">
        <Link href={`${base}/menu`} className="flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Image src="/brasa/994099d9c9.png" alt="" width={32} height={32} className="size-8 shrink-0 object-contain" unoptimized />
          <span className="min-w-0"><span className="block truncate text-title-md">{restaurantName}</span><span className="block text-label-sm text-muted-foreground uppercase">Menú</span></span>
        </Link>
        <nav aria-label="Navegación principal" className="hidden lg:flex lg:items-center lg:gap-1">
          {NAV_ITEMS.map(({ id, title, icon: Icon }) => <Link key={id} href={navHref(base, id)} className={`flex h-11 items-center gap-2 rounded-xl px-4 text-label-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}><Icon className="size-5" /><span>{title}{id === 'orden' && count > 0 ? ` · ${count}` : ''}</span></Link>)}
        </nav>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-1 text-label-md text-secondary-foreground tabular-nums"><Armchair className="size-4" />{tableLabel}</span>
      </div>
    </header>
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex h-16 max-w-screen-sm items-center justify-around">
        {NAV_ITEMS.map(({ id, title, icon: Icon }) => <Link key={id} href={navHref(base, id)} className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}><Icon className="size-5" /><span className="text-label-sm">{title}{id === 'orden' && count > 0 ? ` · ${count}` : ''}</span></Link>)}
      </div>
    </nav>
  </>
}
