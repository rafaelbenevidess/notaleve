import Link from 'next/link'
import { Logo } from '@/components/ui'

export default function Publico({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-linha bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/"><Logo /></Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/entrar" className="rounded-lg px-3 py-2 font-medium hover:bg-fundo">Entrar</Link>
            <Link href="/cadastro" className="rounded-lg bg-marca-600 px-3 py-2 font-semibold text-white hover:bg-marca-700">Teste grátis</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-linha bg-white py-6 text-center text-xs text-suave">
        NotaLeve · cálculos com as calculadoras oficiais de código aberto da Receita Federal · o cenário 2033 é uma simulação
      </footer>
    </div>
  )
}
