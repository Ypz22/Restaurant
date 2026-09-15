import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useParams: () => ({ restaurantSlug: 'sabor-brasa', tableId: 'qr-1' }),
  useRouter: () => ({ push: vi.fn() }),
}))

import PedidoConfirmadoPage from '@/app/r/[restaurantSlug]/mesa/[tableId]/orden/confirmado/page'

describe('PedidoConfirmadoPage', () => {
  it('shows a confirmation message and a link back to the menu', () => {
    render(<PedidoConfirmadoPage />)
    expect(screen.getByText(/pedido enviado/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /seguir pidiendo/i })).toBeInTheDocument()
  })
})
