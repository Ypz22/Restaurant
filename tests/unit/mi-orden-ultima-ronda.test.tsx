import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useParams: () => ({ restaurantSlug: 'sabor-brasa', tableId: 'qr-1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('@/hooks/use-cart-realtime', () => ({ useCartRealtime: () => ({ items: [], loading: false, error: null }) }))
vi.mock('@/lib/session/device-token', () => ({ getDeviceToken: () => 'device-1' }))
vi.mock('@/lib/data/session', () => ({ resumeSession: async () => ({ tableSessionId: 'session-1', dinerId: 'diner-1', sessionStatus: 'open', qrToken: 'qr-1', restaurantSlug: 'sabor-brasa', tableLabel: 'Mesa 04' }) }))
vi.mock('@/lib/data/table', () => ({ getTableByQrToken: async () => null }))
vi.mock('@/lib/data/menu', () => ({ getMenu: async () => ({ dishes: [] }) }))
vi.mock('@/lib/data/cart', () => ({ updateCartItemQuantity: vi.fn(), removeCartItem: vi.fn() }))
vi.mock('@/lib/data/orders', () => ({ submitOrderRound: vi.fn() }))
vi.mock('@/lib/data/latest-order', () => ({
  getOrderHistory: async () => [{
    id: 'round-1', submittedAt: '2026-09-15T20:00:00Z', status: 'ready', kitchenNotes: '', total: 18.5,
    items: [{ id: 'item-1', dishId: 'dish-1', dishName: 'Costillar al Quebracho', quantity: 1, notes: '', unitPrice: 18.5 }],
  }, {
    id: 'round-0', submittedAt: '2026-09-15T19:00:00Z', status: 'delivered', kitchenNotes: '', total: 7.5,
    items: [{ id: 'item-0', dishId: 'dish-0', dishName: 'Calamares Fritos', quantity: 1, notes: '', unitPrice: 7.5 }],
  }],
}))

import MiOrdenPage from '@/app/r/[restaurantSlug]/mesa/[tableId]/orden/page'

describe('MiOrdenPage sin carrito activo', () => {
  it('deja abierta la última ronda con su estado actual de cocina', async () => {
    render(<MiOrdenPage />)

    expect(await screen.findByRole('heading', { name: 'Última ronda' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Listo para servir')
    expect(screen.getByText(/Costillar al Quebracho/)).toBeInTheDocument()
  })

  it('muestra el estado de cocina de una ronda anterior dentro de su modal', async () => {
    render(<MiOrdenPage />)

    const detailButton = await screen.findByRole('button', { name: 'Ver detalle de Ronda 1' })
    fireEvent.click(detailButton)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Estado del pedido' })).toBeInTheDocument()
    expect(within(dialog).getByRole('status')).toHaveTextContent('Pedido entregado')
  })
})
