import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({
  useParams: () => ({ restaurantSlug: 'sabor-brasa', tableId: 'qr-1' }),
  useRouter: () => ({ push, replace: vi.fn() }),
}))

vi.mock('@/lib/session/device-token', () => ({ getDeviceToken: () => 'device-1' }))
vi.mock('@/lib/data/session', () => ({ resumeSession: async () => ({ sessionStatus: 'open', qrToken: 'qr-1', tableLabel: 'Mesa 04' }) }))
vi.mock('@/lib/data/latest-order', () => ({ getLatestOrder: async () => ({
  id: 'round-1', submittedAt: '2026-09-15T20:00:00Z', status: 'pending', kitchenNotes: 'Sin frutos secos',
  items: [{ id: 'item-1', dishName: 'Costillar al Quebracho', quantity: 2, unitPrice: 18.5, notes: '' }], total: 37,
}) }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({
  channel: () => ({ on() { return this }, subscribe() { return this } }), removeChannel: vi.fn(),
}) }))

import PedidoConfirmadoPage from '@/app/r/[restaurantSlug]/mesa/[tableId]/orden/confirmado/page'

describe('PedidoConfirmadoPage', () => {
  it('shows the submitted round from Supabase with its total and kitchen notes', async () => {
    render(<PedidoConfirmadoPage />)
    expect(await screen.findByRole('heading', { name: /pedido enviado/i })).toBeInTheDocument()
    expect(screen.getByText('Costillar al Quebracho', { exact: false })).toBeInTheDocument()
    expect(within(screen.getByText('Total').parentElement!).getByText('$37.00')).toBeInTheDocument()
    expect(screen.getByText(/Sin frutos secos/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /seguir pidiendo/i })).toBeInTheDocument()
  })
})
