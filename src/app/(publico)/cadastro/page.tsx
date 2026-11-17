import type { Metadata } from 'next'
import { FormAuth } from '@/components/form-auth'

export const metadata: Metadata = { title: 'Criar conta' }

export default function Pagina() {
  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <p className="mb-6 mt-1 text-sm text-suave">14 dias grátis, sem cartão.</p>
      <div className="rounded-xl border border-linha bg-white p-5"><FormAuth modo="cadastro" /></div>
    </div>
  )
}
