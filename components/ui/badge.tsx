import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 h-6 text-label-sm uppercase',
  {
    variants: {
      variant: {
        muted: 'bg-muted text-muted-foreground',
        warning: 'bg-warning-soft text-warning-soft-foreground',
        success: 'bg-success-soft text-success-soft-foreground',
        danger: 'bg-danger-soft text-danger-soft-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
      },
    },
    defaultVariants: { variant: 'muted' },
  }
)

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { Badge, badgeVariants }
