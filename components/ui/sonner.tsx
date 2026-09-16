'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'rounded-full bg-inverse text-inverse-foreground border-none shadow-xl px-4 py-3',
          description: 'text-inverse-foreground/80',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
