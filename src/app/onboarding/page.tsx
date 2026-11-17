import type { Metadata } from 'next'
import { FormEmpresa } from '@/components/form-empresa'
import { Logo } from '@/components/ui'
import { ufs } from '@/lib/receita/client'
import { usuarioOuLogin } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Cadastro da loja' }

export default async function Onboarding() {
  await usuarioOuLogin()
  const lista = await ufs().catch(() => [])
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Logo />
      <h1 className="mt-6 text-2xl font-bold">Dados da sua loja</h1>
      <p className="mb-6 mt-1 text-sm text-suave">Usamos estes dados para emitir a NFC-e e calcular os tributos. Seu teste grátis de 14 dias começa agora.</p>
      <div className="rounded-xl border border-linha bg-white p-5">
        {lista.length === 0 ? <p className="text-sm text-erro">As tabelas oficiais da Receita estão indisponíveis. Verifique se as calculadoras estão no ar (npm run receita:up).</p> : <FormEmpresa ufs={lista} />}
      </div>
    </div>
  )
}
