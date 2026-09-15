import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DishSearchBar } from '@/components/dish-search-bar'

describe('DishSearchBar', () => {
  it('calls onChange as the user types', () => {
    const onChange = vi.fn()
    render(<DishSearchBar value="" onChange={onChange} />)

    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'bife' } })

    expect(onChange).toHaveBeenCalledWith('bife')
  })
})
