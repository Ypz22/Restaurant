import type { Metadata } from 'next'
import { Figtree, Young_Serif } from 'next/font/google'
import './globals.css'

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
})

const youngSerif = Young_Serif({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-young-serif',
})

export const metadata: Metadata = {
  title: 'Pedidos de Mesa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${figtree.variable} ${youngSerif.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
