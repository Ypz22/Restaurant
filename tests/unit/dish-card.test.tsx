import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DishCard } from '@/components/dish-card'

describe('DishCard', () => {
  const dish = {
    id: 'd1', categoryId: 'a', name: 'Ojo de Bife', description: 'A la leña',
    price: 18.5, photoUrl: null, isAvailable: true,
  }

  it('shows name and formatted price, and is clickable', () => {
    const onClick = vi.fn()
    render(<DishCard dish={dish} onClick={onClick} />)

    expect(screen.getByText('Ojo de Bife')).toBeInTheDocument()
    expect(screen.getByText('$18.50')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith('d1')
  })

  it('shows an unavailable badge and is not clickable when out of stock', () => {
    const onClick = vi.fn()
    render(<DishCard dish={{ ...dish, isAvailable: false }} onClick={onClick} />)

    expect(screen.getByText(/agotado/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
