import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuantityStepper } from '@/components/quantity-stepper'

describe('QuantityStepper', () => {
  it('increments and decrements, never going below min', () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={1} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: '+' }))
    expect(onChange).toHaveBeenCalledWith(2)

    fireEvent.click(screen.getByRole('button', { name: '-' }))
    expect(onChange).toHaveBeenCalledWith(0)
  })
})
