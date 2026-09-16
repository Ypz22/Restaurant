'use client'

import * as React from 'react'
import { ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

// Versión reducida del `chart` de shadcn/ui: cada serie declara su color con un
// token (`var(--chart-n)`) y el contenedor lo expone como `--color-<clave>`.
export type ChartConfig = Record<string, { label: string; color: string }>

export function ChartContainer({
  config, className, children,
}: { config: ChartConfig; className?: string; children: React.ReactElement }) {
  const style = Object.fromEntries(
    Object.entries(config).map(([key, { color }]) => [`--color-${key}`, color])
  ) as React.CSSProperties

  return (
    <div
      style={style}
      className={cn(
        'h-72 w-full text-label-md',
        '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border',
        '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted',
        '[&_.recharts-surface]:outline-none [&_.recharts-sector]:outline-none',
        className
      )}
    >
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  )
}

type TooltipEntry = { dataKey?: unknown; name?: unknown; value?: unknown; payload?: Record<string, unknown> }

export function ChartTooltipContent({
  active, payload, label, config, formatValue, formatLabel,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
  label?: unknown
  config: ChartConfig
  formatValue: (value: number) => string
  formatLabel?: (label: unknown, payload: readonly TooltipEntry[]) => React.ReactNode
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-36 rounded-xl border border-border bg-popover px-3 py-2 text-label-md text-popover-foreground shadow-md">
      {label !== undefined && (
        <p className="mb-1 text-foreground">{formatLabel ? formatLabel(label, payload) : String(label)}</p>
      )}
      <ul className="flex flex-col gap-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? entry.name)
          const item = config[key]
          return (
            <li key={key} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: `var(--color-${key}, ${item?.color})` }} />
              <span className="text-muted-foreground">{item?.label ?? String(entry.name)}</span>
              <span className="ml-auto tabular-nums text-foreground">{formatValue(Number(entry.value))}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ChartLegend({ config, className }: { config: ChartConfig; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-label-md text-muted-foreground', className)}>
      {Object.entries(config).map(([key, { label, color }]) => (
        <li key={key} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: color }} />
          {label}
        </li>
      ))}
    </ul>
  )
}
