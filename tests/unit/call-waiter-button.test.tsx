import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CallWaiterButton } from '@/components/call-waiter-button'

vi.mock('@/lib/data/requests', () => ({
  createTableRequest: vi.fn().mockResolvedValue({ id: '1', type: 'llamar_mesero', status: 'pending' }),
}))

describe('CallWaiterButton', () => {
  it('shows a confirmation after calling the waiter', async () => {
    render(<CallWaiterButton deviceToken="token-1" />)

    fireEvent.click(screen.getByRole('button', { name: /llamar mesero/i }))

    await waitFor(() => {
      expect(screen.getByText(/mesero en camino/i)).toBeInTheDocument()
    })
  })
})
