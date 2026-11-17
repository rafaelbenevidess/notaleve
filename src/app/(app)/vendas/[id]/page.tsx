import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cancelarNota, emitirNotaDaVenda } from '@/app/acoes/vendas'
import { Comparativo } from '@/components/comparativo'
import { FormAcao } from '@/components/form-acao'
import { Aviso, brl, Cartao, dataHora, Entrada, Selo, Titulo } from '@/components/ui'
import { MEIOS_PAGAMENTO } from '@/lib/fiscal/nfce/danfe'
import { contexto } from '@/lib/sessao'
import type { ComparativoVenda, ResultadoCalculo } from '@/lib/tributos/tipos'

export const metadata: Metadata = { title: 'Venda' }

export default async function Venda({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nova?: string; aviso?: string }> }) {
  const { id } = await params
  const { nova, aviso } = await searchParams
  const { sb, empresa } = await contexto()
  const { data: v } = await sb.from('vendas').select('*').eq('id', id).eq('empresa_id', empresa.id).maybeSingle()
  if (!v) notFound()
  const [{ data: itens }, { data: pags }, { data: calcs }, { data: notas }] = await Promise.all([
    sb.from('venda_itens').select('*').eq('venda_id', id).order('numero_item'),
    sb.from('venda_pagamentos').select('*').eq('venda_id', id),
    sb.from('calculos').select('modo, resultado').eq('venda_id', id),
    sb.from('notas').select('id, numero, serie, chave, status, c_stat, x_motivo, protocolo, emitida_em').eq('venda_id', id).order('emitida_em', { ascending: false }),
  ])
  const hoje = calcs?.find((c) => c.modo === 'hoje')?.resultado as ResultadoCalculo | undefined
  const reforma = calcs?.find((c) => c.modo === '2033')?.resultado as ResultadoCalculo | undefined
  const comp: ComparativoVenda | null = hoje && reforma ? {
    hoje, reforma, diferenca: Math.round((reforma.totais.tributos - hoje.totais.tributos) * 100) / 100,
    diferencaPct: Math.round((reforma.totais.cargaEfetivaPct - hoje.totais.cargaEfetivaPct) * 100) / 100,
  } : null
  const autorizada = notas?.find((n) => n.status === 'autorizada')
  const cancelada = notas?.find((n) => n.status === 'cancelada')
  const ultima = notas?.[0]
  return (
    <>
      <Titulo sub={dataHora(v.data_hora)}>Venda #{v.numero} {v.status === 'cancelada' && <Selo tom="erro">cancelada</Selo>}</Titulo>
      {nova && !aviso && autorizada && <div className="mb-4"><Aviso tom="ok">Venda registrada e NFC-e nº {autorizada.numero} autorizada.</Aviso></div>}
      {nova && !aviso && !autorizada && <div className="mb-4"><Aviso tom="ok">Venda registrada.</Aviso></div>}
      {aviso && <div className="mb-4"><Aviso tom="alerta">{aviso}</Aviso></div>}
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Cartao titulo="Itens">
            <table className="w-full text-sm">
              <tbody>
                {(itens ?? []).map((i) => (
                  <tr key={i.id} className="border-b border-linha last:border-0">
                    <td className="py-2">{i.descricao}<span className="block text-xs text-suave">NCM {i.ncm} · cClassTrib {i.cclasstrib}</span></td>
                    <td className="num whitespace-nowrap py-2 pl-3 text-right text-suave">{Number(i.quantidade).toLocaleString('pt-BR')} × {brl(i.preco_unitario)}</td>
                    <td className="num whitespace-nowrap py-2 pl-3 text-right font-semibold">{brl(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-between border-t border-linha pt-3 text-sm"><span className="text-suave">{(pags ?? []).map((p) => `${MEIOS_PAGAMENTO[p.meio] ?? p.meio} ${brl(p.valor)}`).join(' · ')}</span><span className="num text-lg font-bold">{brl(v.total)}</span></div>
          </Cartao>
          {comp && <Cartao titulo="Impostos desta venda: hoje × reforma completa"><Comparativo c={comp} /></Cartao>}
        </div>
        <Cartao titulo="NFC-e">
          {autorizada ? (
            <div className="space-y-3 text-sm">
              <p><Selo tom="ok">autorizada</Selo> nº {autorizada.numero} · série {autorizada.serie}</p>
              <p className="num break-all text-xs text-suave">Chave {autorizada.chave}<br />Protocolo {autorizada.protocolo}</p>
              <div className="flex flex-wrap gap-2">
                <a className="rounded-lg bg-marca-600 px-3 py-2 font-semibold text-white" href={`/api/notas/${autorizada.id}/danfe`} target="_blank">DANFE (PDF)</a>
                <a className="rounded-lg border border-linha px-3 py-2 font-semibold" href={`/api/notas/${autorizada.id}/xml`}>XML</a>
              </div>
              <details className="rounded-lg border border-linha p-3">
                <summary className="cursor-pointer font-medium text-erro">Cancelar NFC-e</summary>
                <FormAcao acao={cancelarNota} botao="Confirmar cancelamento" variante="perigo" className="mt-3 space-y-3">
                  <input type="hidden" name="notaId" value={autorizada.id} />
                  <Entrada name="justificativa" minLength={15} required placeholder="Motivo (mín. 15 caracteres)" aria-label="Justificativa" />
                  <p className="text-xs text-suave">Prazo: até 24 horas após a autorização.</p>
                </FormAcao>
              </details>
            </div>
          ) : cancelada ? (
            <div className="space-y-2 text-sm"><Aviso tom="info">NFC-e nº {cancelada.numero} cancelada na SEFAZ. A venda também foi cancelada.</Aviso><a className="font-semibold text-marca-700 underline" href={`/api/notas/${cancelada.id}/danfe`} target="_blank">DANFE (PDF)</a></div>
          ) : (
            <div className="space-y-3 text-sm">
              {ultima?.status === 'rejeitada' && <Aviso tom="erro">Última tentativa rejeitada: {ultima.c_stat} — {ultima.x_motivo}</Aviso>}
              {ultima?.status === 'enviada' && <Aviso tom="alerta">Envio sem resposta da SEFAZ (nº {ultima.numero}). Tente novamente.</Aviso>}
              {v.status !== 'cancelada' && <FormAcao acao={emitirNotaDaVenda} botao="Emitir NFC-e"><input type="hidden" name="vendaId" value={v.id} /></FormAcao>}
            </div>
          )}
        </Cartao>
      </div>
    </>
  )
}
