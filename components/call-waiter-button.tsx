'use client'

import { useState } from 'react'
import { createTableRequest } from '@/lib/data/requests'

export function CallWaiterButton({ deviceToken }: { deviceToken: string }) {
  const [confirmed, setConfirmed] = useState(false)

  async function handleClick() {
    await createTableRequest(deviceToken, 'llamar_mesero')
    setConfirmed(true)
    setTimeout(() => setConfirmed(false), 4000)
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 rounded-full bg-primary px-5 py-3 font-semibold text-onPrimary shadow-lg"
    >
      {confirmed ? 'Mesero en camino' : 'Llamar mesero'}
    </button>
  )
}
