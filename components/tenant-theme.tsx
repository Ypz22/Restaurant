'use client'

import { useEffect } from 'react'

export function TenantTheme({ theme }: { theme: string }) {
  useEffect(() => {
    const previousTheme = document.body.dataset.theme
    document.body.dataset.theme = theme

    return () => {
      if (previousTheme) document.body.dataset.theme = previousTheme
      else delete document.body.dataset.theme
    }
  }, [theme])

  return null
}
