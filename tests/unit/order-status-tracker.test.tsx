import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderStatusTracker } from '@/components/brasa/order-status-tracker'

describe('OrderStatusTracker', () => {
  it('marca el paso actual y los anteriores cuando la cocina prepara la ronda', () => {
    render(<OrderStatusTracker status="preparing" />)

    expect(screen.getAllByText('Recibido')).not.toHaveLength(0)
    expect(screen.getByText('En preparación')).toBeInTheDocument()
    expect(screen.getByText('Listo para servir')).toBeInTheDocument()
    expect(screen.getAllByText('Entregado')).not.toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent('En preparación')
  })

  it('informa que la ronda fue entregada cuando Cocina completa el último paso', () => {
    render(<OrderStatusTracker status="delivered" />)

    expect(screen.getByRole('status')).toHaveTextContent('Pedido entregado')
  })

  it('destaca una ronda recién recibida con el color primario del restaurante', () => {
    render(<OrderStatusTracker status="pending" />)

    expect(screen.getByRole('status')).toHaveClass('bg-primary', 'text-primary-foreground')
  })
})
