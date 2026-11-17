import Link from 'next/link'
import { sair } from '@/app/acoes/auth'
import { Nav } from '@/components/nav'
import { Logo } from '@/components/ui'
import { contexto } from '@/lib/sessao'
import { diasAte } from '@/lib/util/datas'

export default async function AreaLogada({ children }: { children: React.ReactNode }) {
  const { empresa, assinatura, podeOperar, user } = await contexto()
  const diasTrial = assinatura ? diasAte(assinatura.trial_ate) : 0
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-linha bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Link href="/painel"><Logo /></Link>
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-right sm:block">
                <span className="block font-semibold leading-tight">{empresa.nome_fantasia || empresa.razao_social}</span>
                <span className="block text-xs text-suave">{user.email} · {empresa.ambiente === 'homologacao' ? 'homologação' : 'produção'}</span>
              </span>
              <form action={sair}><button className="rounded-lg px-3 py-2 text-suave hover:bg-fundo" type="submit">Sair</button></form>
            </div>
          </div>
          <Nav />
        </div>
      </header>
      {!podeOperar && (
        <div className="bg-red-50 px-4 py-2 text-center text-sm text-erro">
          Sua assinatura está {assinatura?.status === 'trial' ? 'com o teste expirado' : assinatura?.status}. Você pode consultar, mas não registrar vendas nem emitir notas. <Link className="font-semibold underline" href="/assinatura">Regularizar</Link>
        </div>
      )}
      {podeOperar && assinatura?.status === 'trial' && (
        <div className="bg-marca-50 px-4 py-2 text-center text-sm text-marca-700">
          Teste grátis: {diasTrial} dia{diasTrial === 1 ? '' : 's'} restante{diasTrial === 1 ? '' : 's'}. <Link className="font-semibold underline" href="/assinatura">Ativar assinatura</Link>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
