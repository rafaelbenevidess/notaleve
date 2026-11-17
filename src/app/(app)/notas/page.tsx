import type { Metadata } from 'next'
import Link from 'next/link'
import { inutilizar } from '@/app/acoes/vendas'
import { FormAcao } from '@/components/form-acao'
import { brl, Cartao, dataHora, Entrada, Selo, Titulo } from '@/components/ui'
import { contexto } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Notas' }

export default async function Notas() {
  const { sb, empresa } = await contexto()
  const { data: notas } = await sb.from('notas').select('id, venda_id, numero, serie, chave, status, c_stat, x_motivo, emitida_em, vendas(total, numero)').eq('empresa_id', empresa.id).order('emitida_em', { ascending: false }).limit(200)
  const mes = new Date().toISOString().slice(0, 7)
  return (
    <>
      <Titulo sub={`Série ${empresa.nfce_serie} · próximo número ${empresa.nfce_proximo_numero} · ${empresa.ambiente}`}
        acao={<form action="/api/notas/exportar" className="flex gap-2"><Entrada type="month" name="mes" defaultValue={mes} aria-label="Mês" className="w-40" /><button className="rounded-lg border border-linha bg-white px-3 py-2 text-sm font-semibold">Exportar XMLs (contador)</button></form>}>
        Notas fiscais (NFC-e)
      </Titulo>
      <div className="overflow-x-auto rounded-xl border border-linha bg-white">
        <table className="w-full text-sm">
          <thead className="bg-fundo text-left text-xs uppercase text-suave"><tr><th className="px-4 py-3">Nº</th><th className="px-4 py-3">Emissão</th><th className="px-4 py-3">Venda</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3" /></tr></thead>
          <tbody>
            {(notas ?? []).map((n) => {
              const v = n.vendas as unknown as { total: number; numero: number } | null
              return (
                <tr key={n.id} className="border-t border-linha">
                  <td className="num px-4 py-3 font-medium">{n.numero}</td>
                  <td className="px-4 py-3 text-suave">{dataHora(n.emitida_em)}</td>
                  <td className="px-4 py-3"><Link className="hover:underline" href={`/vendas/${n.venda_id}`}>#{v?.numero}</Link></td>
                  <td className="num px-4 py-3 text-right">{brl(v?.total)}</td>
                  <td className="px-4 py-3"><Selo tom={n.status === 'autorizada' ? 'ok' : n.status === 'cancelada' ? 'neutro' : 'erro'}>{n.status}</Selo>{n.status === 'rejeitada' && <span className="block text-xs text-erro">{n.c_stat} — {n.x_motivo}</span>}</td>
                  <td className="px-4 py-3 text-right">{(n.status === 'autorizada' || n.status === 'cancelada') && <a className="text-xs font-semibold text-marca-700" href={`/api/notas/${n.id}/danfe`} target="_blank">DANFE</a>}</td>
                </tr>
              )
            })}
            {!notas?.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-suave">Nenhuma NFC-e emitida.</td></tr>}
          </tbody>
        </table>
      </div>
      <Cartao titulo="Inutilizar numeração" className="mt-6">
        <p className="mb-3 text-sm text-suave">Use quando números foram pulados (ex.: falha antes do envio). A SEFAZ registra que esses números não serão usados.</p>
        <FormAcao acao={inutilizar} botao="Inutilizar" variante="secundario" className="grid gap-3 sm:grid-cols-4 [&>button]:self-end">
          <Entrada name="inicial" type="number" min={1} placeholder="Nº inicial" required aria-label="Número inicial" />
          <Entrada name="final" type="number" min={1} placeholder="Nº final" required aria-label="Número final" />
          <Entrada name="justificativa" minLength={15} placeholder="Justificativa (mín. 15 caracteres)" required aria-label="Justificativa" className="sm:col-span-2" />
        </FormAcao>
      </Cartao>
    </>
  )
}
