import { Check, CheckCheck, Clock3 } from 'lucide-react'
import type { LatestOrder } from '@/lib/data/latest-order'
import { cn } from '@/lib/utils'

type OrderStatusTrackerProps = {
  status: LatestOrder['status']
}

const stages: Array<{ status: LatestOrder['status']; label: string; compactLabel: string }> = [
  { status: 'pending', label: 'Recibido', compactLabel: 'Recibido' },
  { status: 'preparing', label: 'En preparación', compactLabel: 'En curso' },
  { status: 'ready', label: 'Listo para servir', compactLabel: 'Lista' },
  { status: 'delivered', label: 'Entregado', compactLabel: 'Entregado' },
]

const statusCopy: Record<LatestOrder['status'], string> = {
  pending: 'Recibido · En cocina',
  preparing: 'En preparación · Cocina está trabajando',
  ready: 'Listo para servir',
  delivered: 'Pedido entregado',
}

const statusStyles: Record<LatestOrder['status'], string> = {
  pending: 'bg-primary text-primary-foreground',
  preparing: 'bg-warning-soft text-warning-soft-foreground',
  ready: 'bg-success-soft text-success-soft-foreground',
  delivered: 'bg-muted text-muted-foreground',
}

export function OrderStatusTracker({ status }: OrderStatusTrackerProps) {
  const currentIndex = stages.findIndex((stage) => stage.status === status)

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4" aria-labelledby="estado-del-pedido">
      <div className="flex items-center justify-between gap-3">
        <div id="estado-del-pedido" role="heading" aria-level={2} className="text-title-md font-semibold text-foreground">Estado del pedido</div>
        <span className={cn('rounded-full px-2.5 py-1 text-label-md font-semibold', statusStyles[status])} role="status">
          {statusCopy[status]}
        </span>
      </div>
      <ol className="mt-5 grid grid-cols-4 gap-1" aria-label="Progreso de la ronda">
        {stages.map((stage, index) => {
          const complete = index < currentIndex
          const current = index === currentIndex
          const Icon = stage.status === 'delivered' && complete ? CheckCheck : complete ? Check : current ? Clock3 : undefined

          return (
            <li key={stage.status} aria-current={current ? 'step' : undefined} className="min-w-0 text-center">
              <span className={cn(
                'mx-auto flex size-8 items-center justify-center rounded-full border text-label-md tabular-nums',
                complete ? 'border-primary bg-primary text-primary-foreground' : current ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border bg-card text-muted-foreground'
              )}>
                {Icon ? <Icon className="size-4" aria-hidden="true" /> : index + 1}
              </span>
              <span className={cn('mt-2 block text-label-sm leading-3 sm:text-label-md sm:leading-4', current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                <span className="sm:hidden">{stage.compactLabel}</span><span className="hidden sm:inline">{stage.label}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
