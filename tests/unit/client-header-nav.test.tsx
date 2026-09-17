import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientHeaderNav } from '@/components/client-header-nav'

describe('ClientHeaderNav', () => {
  it('only exposes menu, order, and waiter navigation to diners', () => {
    render(<ClientHeaderNav base="/r/sabor-brasa/mesa/qr-1" restaurantName="Sabor & Brasa" tableLabel="Mesa 04" active="menu" count={0} />)

    expect(screen.getAllByRole('link', { name: /^Menú$/ })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: /^Mi orden$/ })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: /^Camarero$/ })).toHaveLength(2)
    expect(screen.queryAllByRole('link', { name: /favoritos/i })).toHaveLength(0)
  })
})
