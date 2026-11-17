import type { Metadata } from 'next'
import { FormAuth } from '@/components/form-auth'

export const metadata: Metadata = { title: 'Entrar' }

export default function Pagina() {
  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mb-6 mt-1 text-sm text-suave">Acesse o caixa da sua loja.</p>
      <div className="rounded-xl border border-linha bg-white p-5"><FormAuth modo="entrar" /></div>
    </div>
  )
}
