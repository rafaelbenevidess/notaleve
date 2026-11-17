import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'NotaLeve', template: '%s · NotaLeve' },
  description: 'Vendas e NFC-e para o pequeno comércio, já no modelo da Reforma Tributária.',
}
export const viewport: Viewport = { themeColor: '#14805e', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
