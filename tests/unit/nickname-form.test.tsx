import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NicknameForm } from '@/components/nickname-form'

describe('NicknameForm', () => {
  it('calls onSubmit with the trimmed nickname', () => {
    const onSubmit = vi.fn()
    render(<NicknameForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/apodo/i), { target: { value: '  Ana  ' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(onSubmit).toHaveBeenCalledWith('Ana')
  })

  it('does not call onSubmit with an empty nickname', () => {
    const onSubmit = vi.fn()
    render(<NicknameForm onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
