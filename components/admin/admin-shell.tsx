'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { BookOpen, Armchair, ChartLine, WifiOff, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RequestsProvider, useTableRequests } from '@/components/admin/requests-context'
import { SignOutButton } from '@/components/auth/sign-out-button'

export function AdminShell(props: { children: ReactNode; restaurantSlug: string; restaurantName: string }) {
  return (
    <RequestsProvider>
      <Shell {...props} />
    </RequestsProvider>
  )
}

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-label-sm tabular-nums text-destructive-foreground',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function Shell({
  children, restaurantSlug, restaurantName,
}: { children: ReactNode; restaurantSlug: string; restaurantName: string }) {
  const { requests, offline } = useTableRequests()
  const pathname = usePathname()
  const base = `/admin/${restaurantSlug}`
  const links = [
    { href: `${base}/dashboard`, label: 'Ventas', icon: ChartLine },
    { href: `${base}/menu`, label: 'Menú', icon: BookOpen },
    { href: `${base}/mesas`, label: 'Mesas', icon: Armchair, badge: requests.length },
    { href: `${base}/equipo`, label: 'Equipo', icon: Users },
  ]

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1440px] items-center gap-2 px-5">
          <span className="text-label-lg text-foreground">{restaurantName}</span>
          <span className="text-label-sm uppercase text-muted-foreground">Administración</span>
          <div className="ml-auto">
            <SignOutButton />
          </div>
        </div>
      </header>
      {offline && (
        <div className="flex items-center justify-center gap-2 border-b border-border bg-warning-soft px-5 py-1.5 text-label-md text-warning-soft-foreground">
          <WifiOff className="size-4" /> Sin conexión, reintentando…
        </div>
      )}
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[1440px]">
        <nav className="hidden w-56 shrink-0 border-r border-border bg-card p-3 xl:block" aria-label="Navegación de administración">
          <ul className="flex flex-col gap-1">
            {links.map(({ href, label, icon: Icon, badge = 0 }) => {
              const active = pathname?.startsWith(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-label={badge > 0 ? `${label}, ${badge} solicitudes pendientes` : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2 text-label-md',
                      active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                    <CountBadge count={badge} className="ml-auto" />
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
          {links.map(({ href, label, icon: Icon, badge = 0 }) => {
            const active = pathname?.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-label={badge > 0 ? `${label}, ${badge} solicitudes pendientes` : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-3 text-label-sm',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  <CountBadge count={badge} className="absolute -top-2 left-3" />
                </span>
                {label}
              </Link>
            )
          })}
        </nav>
        <main className="min-w-0 flex-1 p-5 pb-24 xl:pb-5">{children}</main>
      </div>
    </div>
  )
}
