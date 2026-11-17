'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const itens = [
  { href: '/painel', rotulo: 'Painel' },
  { href: '/vender', rotulo: 'Vender' },
  { href: '/vendas', rotulo: 'Vendas' },
  { href: '/notas', rotulo: 'Notas' },
  { href: '/produtos', rotulo: 'Produtos' },
  { href: '/configuracoes', rotulo: 'Configurações' },
  { href: '/assinatura', rotulo: 'Assinatura' },
]

export function Nav() {
  const atual = usePathname()
  return (
    <nav aria-label="Principal" className="-mx-1 flex gap-1 overflow-x-auto pb-1 text-sm">
      {itens.map((i) => {
        const ativo = atual === i.href || atual.startsWith(i.href + '/')
        return (
          <Link key={i.href} href={i.href} aria-current={ativo ? 'page' : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 font-medium ${ativo ? 'bg-marca-600 text-white' : 'text-suave hover:bg-fundo hover:text-tinta'}`}>
            {i.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
