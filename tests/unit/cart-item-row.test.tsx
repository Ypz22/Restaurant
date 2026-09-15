import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CartItemRow } from '@/components/cart-item-row'

describe('CartItemRow', () => {
  it('shows dish name, nickname, quantity and subtotal', () => {
    render(
      <CartItemRow
        item={{
          id: '1', tableSessionId: 't', dishId: 'd', dinerId: 'din',
          quantity: 2, notes: '', unitPriceSnapshot: 10, status: 'in_cart', orderRoundId: null,
          dishName: 'Ojo de Bife', dinerNickname: 'Ana',
        }}
        onQuantityChange={() => {}}
        onRemove={() => {}}
      />
    )

    expect(screen.getByText('Ojo de Bife')).toBeInTheDocument()
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })
})
