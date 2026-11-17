import type { Metadata } from 'next'
import Link from 'next/link'
import { brl, dataHora, Selo, Titulo, BotaoLink } from '@/components/ui'
import { contexto } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Vendas' }

export default async function Vendas() {
  const { sb, empresa } = await contexto()
  const { data: vendas } = await sb.from('vendas').select('id, numero, data_hora, total, status, notas(numero, status), calculos(modo, total_tributos)').eq('empresa_id', empresa.id).order('data_hora', { ascending: false }).limit(100)
  return (
    <>
      <Titulo acao={<BotaoLink href="/vender">Nova venda</BotaoLink>}>Vendas</Titulo>
      <div className="overflow-x-auto rounded-xl border border-linha bg-white">
        <table className="w-full text-sm">
          <thead className="bg-fundo text-left text-xs uppercase text-suave">
            <tr><th className="px-4 py-3">Venda</th><th className="px-4 py-3">Data</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Tributos hoje</th><th className="px-4 py-3 text-right">2033</th><th className="px-4 py-3">NFC-e</th></tr>
          </thead>
          <tbody>
            {(vendas ?? []).map((v) => {
              const notas = (v.notas ?? []) as Array<{ numero: number; status: string }>
              const nota = notas.find((n) => n.status === 'autorizada' || n.status === 'cancelada') ?? notas[0]
              const calc = (v.calculos ?? []) as Array<{ modo: string; total_tributos: number }>
              return (
                <tr key={v.id} className="border-t border-linha">
                  <td className="px-4 py-3"><Link className="font-medium hover:underline" href={`/vendas/${v.id}`}>#{v.numero}</Link>{v.status === 'cancelada' && <Selo tom="erro">cancelada</Selo>}</td>
                  <td className="px-4 py-3 text-suave">{dataHora(v.data_hora)}</td>
                  <td className="num px-4 py-3 text-right font-semibold">{brl(v.total)}</td>
                  <td className="num px-4 py-3 text-right">{brl(calc.find((c) => c.modo === 'hoje')?.total_tributos)}</td>
                  <td className="num px-4 py-3 text-right text-marca-700">{brl(calc.find((c) => c.modo === '2033')?.total_tributos)}</td>
                  <td className="px-4 py-3">{nota ? <Selo tom={nota.status === 'autorizada' ? 'ok' : nota.status === 'cancelada' ? 'neutro' : 'erro'}>nº {nota.numero} · {nota.status}</Selo> : <Selo>sem nota</Selo>}</td>
                </tr>
              )
            })}
            {!vendas?.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-suave">Nenhuma venda registrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
