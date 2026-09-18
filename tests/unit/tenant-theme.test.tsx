import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { TenantTheme } from '@/components/tenant-theme'

describe('TenantTheme', () => {
  it('propaga el tema del restaurante al body para los portales de diálogos', () => {
    const view = render(<TenantTheme theme="brasa" />)

    expect(document.body).toHaveAttribute('data-theme', 'brasa')

    view.unmount()
    expect(document.body).not.toHaveAttribute('data-theme')
  })
})
