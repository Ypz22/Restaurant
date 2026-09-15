import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryTabs } from '@/components/category-tabs'

describe('CategoryTabs', () => {
  const categories = [
    { id: 'a', name: 'Parrilla', sortOrder: 1 },
    { id: 'b', name: 'Entradas', sortOrder: 2 },
  ]

  it('highlights the active category and calls onSelect', () => {
    const onSelect = vi.fn()
    render(<CategoryTabs categories={categories} activeId="a" onSelect={onSelect} />)

    const entradasTab = screen.getByRole('button', { name: 'Entradas' })
    fireEvent.click(entradasTab)

    expect(onSelect).toHaveBeenCalledWith('b')
  })
})
