'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { BookOpen, Armchair, ConciergeBell } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AdminShell({
  children, restaurantSlug, restaurantName,
}: { children: ReactNode; restaurantSlug: string; restaurantName: string }) {
  const pathname = usePathname()
  const base = `/admin/${restaurantSlug}`
  const links = [
    { href: `${base}/menu`, label: 'Menú', icon: BookOpen },
    { href: `${base}/mesas`, label: 'Mesas', icon: Armchair },
    { href: `${base}/kitchen`, label: 'Cocina (KDS)', icon: ConciergeBell },
  ]

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 h-16 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1440px] items-center px-6">
          <span className="text-title-md text-foreground">{restaurantName}</span>
          <span className="ml-3 text-label-sm uppercase text-muted-foreground">Panel de administración</span>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1440px]">
        <nav className="hidden w-64 shrink-0 border-r border-border bg-card p-4 xl:block" aria-label="Navegación de administración">
          <ul className="flex flex-col gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname?.startsWith(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-label-lg',
                      active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="size-5" />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card xl:hidden"
          aria-label="Navegación de administración"
        >
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-3 text-label-sm',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            )
          })}
        </nav>
        <main className="min-w-0 flex-1 p-6 pb-24 xl:pb-6">{children}</main>
      </div>
    </div>
  )
}
