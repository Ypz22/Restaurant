'use client'

import { useState } from 'react'

export function NicknameForm({
  onSubmit,
  disabled = false,
}: {
  onSubmit: (nickname: string) => void
  disabled?: boolean
}) {
  const [nickname, setNickname] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="nickname" className="text-title-md font-semibold text-onSurface">
        ¿Cómo te llamamos?
      </label>
      <input
        id="nickname"
        aria-label="Apodo"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Tu apodo"
        className="rounded-md border border-outline bg-surface px-4 py-3 text-onSurface"
      />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-primary px-6 py-3 font-semibold text-onPrimary disabled:opacity-50"
      >
        Entrar
      </button>
    </form>
  )
}
