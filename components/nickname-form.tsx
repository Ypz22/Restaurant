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
      <label htmlFor="nickname" className="text-title-md font-semibold text-foreground">
        ¿Cómo te llamamos?
      </label>
      <input
        id="nickname"
        aria-label="Apodo"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Tu apodo"
        className="rounded-xl border border-input bg-card px-4 py-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="submit"
        disabled={disabled}
        className="h-11 rounded-xl bg-primary px-6 font-semibold text-primary-foreground disabled:opacity-50"
      >
        Entrar
      </button>
    </form>
  )
}
