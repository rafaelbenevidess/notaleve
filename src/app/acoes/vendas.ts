'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { contexto } from '@/lib/sessao'
import { calcularComparativo, ComparativoVenda, ItemVenda } from '@/lib/tributos'
import { ErroEmissao, emitirNfceDaVenda, cancelarNfce, inutilizarNumeracao } from '@/lib/fiscal/nfce/emitir'
import { ReceitaIndisponivel } from '@/lib/receita/client'
import type { EstadoForm } from './auth'
import type { Json } from '@/lib/supabase/database.types'

const carrinho = z.object({
  itens: z.array(z.object({ produtoId: z.uuid(), quantidade: z.number().positive().max(100_000), desconto: z.number().min(0).default(0) })).min(1, 'Adicione ao menos um item.'),
  pagamentos: z.array(z.object({ meio: z.enum(['01', '03', '04', '17', '99']), valor: z.number().positive() })).min(1, 'Informe a forma de pagamento.'),
  emitir: z.boolean().default(false),
})
export type Carrinho = z.input<typeof carrinho>

async function montarItens(sb: Awaited<ReturnType<typeof contexto>>['sb'], empresaId: string, c: z.infer<typeof carrinho>) {
  const ids = [...new Set(c.itens.map((i) => i.produtoId))]
  const { data: prods } = await sb.from('produtos').select('id, nome, ncm, preco, unidade, cfop, csosn, cst_ibscbs, cclasstrib').eq('empresa_id', empresaId).in('id', ids)
  const mapa = new Map((prods ?? []).map((p) => [p.id, p]))
  return c.itens.map((i, idx) => {
    const p = mapa.get(i.produtoId)
    if (!p) throw new Error('Produto não encontrado ou removido.')
    const bruto = Math.round(i.quantidade * Number(p.preco) * 100) / 100
    if (i.desconto > bruto) throw new Error(`Desconto maior que o valor do item "${p.nome}".`)
    const item: ItemVenda = {
      numero: idx + 1, descricao: p.nome, ncm: p.ncm, cstIbsCbs: p.cst_ibscbs, cClassTrib: p.cclasstrib, unidade: p.unidade,
      quantidade: i.quantidade, precoUnitario: Number(p.preco), desconto: i.desconto, total: Math.round((bruto - i.desconto) * 100) / 100,
    }
    return { item, produto: p }
  })
}

const fiscal = (e: Awaited<ReturnType<typeof contexto>>['empresa']) => ({ uf: e.uf, municipioIbge: e.municipio_ibge, crt: e.crt, tpRegimeIbsCbs: e.tp_regime_ibscbs, cAtivSN: e.c_ativ_sn, rbt12: e.rbt12 === null ? null : Number(e.rbt12) })

/** Prévia do comparativo "hoje × 2033" sem gravar nada (RF-23). */
export async function simularVenda(entrada: Carrinho): Promise<{ ok: true; comparativo: ComparativoVenda } | { ok: false; erro: string }> {
  try {
    const { sb, empresa } = await contexto()
    const c = carrinho.parse({ ...entrada, pagamentos: entrada.pagamentos?.length ? entrada.pagamentos : [{ meio: '17', valor: 1 }] })
    const linhas = await montarItens(sb, empresa.id, c)
    const comp = await calcularComparativo(fiscal(empresa), linhas.map((l) => l.item))
    return { ok: true, comparativo: { ...comp, hoje: { ...comp.hoje, request: undefined, response: undefined }, reforma: { ...comp.reforma, request: undefined, response: undefined } } }
  } catch (e) {
    return { ok: false, erro: e instanceof z.ZodError ? e.issues[0].message : (e as Error).message }
  }
}

export interface ResultadoVenda { ok: boolean; erro?: string; vendaId?: string; nota?: { status: string; cStat: string | null; xMotivo: string | null; numero: number } ; avisoNota?: string }

/** Grava a venda + cálculos e, se pedido, emite a NFC-e (RF-20..30). */
export async function finalizarVenda(entrada: Carrinho): Promise<ResultadoVenda> {
  const { sb, empresa, user, podeOperar } = await contexto()
  if (!podeOperar) return { ok: false, erro: 'Assinatura inativa: regularize para registrar vendas.' }
  let c: z.infer<typeof carrinho>
  try { c = carrinho.parse(entrada) } catch (e) { return { ok: false, erro: (e as z.ZodError).issues[0].message } }
  let linhas
  try { linhas = await montarItens(sb, empresa.id, c) } catch (e) { return { ok: false, erro: (e as Error).message } }
  const totalBruto = linhas.reduce((s, l) => s + l.item.quantidade * l.item.precoUnitario, 0)
  const desconto = linhas.reduce((s, l) => s + l.item.desconto, 0)
  const total = Math.round((totalBruto - desconto) * 100) / 100
  const pago = c.pagamentos.reduce((s, p) => s + p.valor, 0)
  if (pago + 0.001 < total) return { ok: false, erro: `Pagamento (${pago.toFixed(2)}) menor que o total (${total.toFixed(2)}).` }
  if (pago - total > 0.001 && !c.pagamentos.some((p) => p.meio === '01')) return { ok: false, erro: 'Troco só é permitido para pagamento em dinheiro.' }

  let comp: ComparativoVenda
  try { comp = await calcularComparativo(fiscal(empresa), linhas.map((l) => l.item)) } catch (e) {
    if (e instanceof ReceitaIndisponivel) return { ok: false, erro: e.message }
    return { ok: false, erro: `Falha no cálculo: ${(e as Error).message}` }
  }

  const { data: venda, error } = await sb.from('vendas').insert({ empresa_id: empresa.id, vendedor_id: user.id, total_bruto: totalBruto, desconto, total }).select('id').single()
  if (error || !venda) return { ok: false, erro: `Falha ao gravar a venda: ${error?.message}` }
  const ins1 = await sb.from('venda_itens').insert(linhas.map((l) => ({
    venda_id: venda.id, empresa_id: empresa.id, numero_item: l.item.numero, produto_id: l.produto.id, descricao: l.item.descricao, ncm: l.item.ncm,
    cfop: l.produto.cfop, csosn: l.produto.csosn, cst_ibscbs: l.item.cstIbsCbs, cclasstrib: l.item.cClassTrib, unidade: l.item.unidade,
    quantidade: l.item.quantidade, preco_unitario: l.item.precoUnitario, desconto: l.item.desconto, total: l.item.total,
  })))
  const ins2 = await sb.from('venda_pagamentos').insert(c.pagamentos.map((p) => ({ venda_id: venda.id, empresa_id: empresa.id, meio: p.meio, valor: p.valor })))
  const ins3 = await sb.from('calculos').insert([comp.hoje, comp.reforma].map((r) => ({
    venda_id: venda.id, empresa_id: empresa.id, modo: r.modo, motor: r.motor, request: (r.request ?? null) as Json, response: (r.response ?? null) as Json,
    resultado: JSON.parse(JSON.stringify({ ...r, request: undefined, response: undefined })) as NonNullable<Json>, total_tributos: r.totais.tributos, carga_efetiva_pct: r.totais.cargaEfetivaPct,
  })))
  const falha = ins1.error ?? ins2.error ?? ins3.error
  if (falha) {
    await sb.from('vendas').delete().eq('id', venda.id)
    return { ok: false, erro: `Falha ao gravar a venda: ${falha.message}` }
  }
  revalidatePath('/vendas'); revalidatePath('/painel')
  if (!c.emitir) return { ok: true, vendaId: venda.id }
  try {
    const n = await emitirNfceDaVenda({ empresaId: empresa.id, vendaId: venda.id, userId: user.id })
    revalidatePath('/notas')
    return { ok: true, vendaId: venda.id, nota: { status: n.status, cStat: n.cStat, xMotivo: n.xMotivo, numero: n.numero } }
  } catch (e) {
    return { ok: true, vendaId: venda.id, avisoNota: `Venda salva, mas a NFC-e não foi emitida: ${(e as Error).message}` }
  }
}

export async function emitirNotaDaVenda(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { empresa, user, podeOperar } = await contexto()
  if (!podeOperar) return { erro: 'Assinatura inativa.' }
  try {
    const n = await emitirNfceDaVenda({ empresaId: empresa.id, vendaId: String(fd.get('vendaId')), userId: user.id })
    revalidatePath('/vendas', 'layout'); revalidatePath('/notas')
    return n.status === 'autorizada' ? { ok: `NFC-e nº ${n.numero} autorizada.` } : { erro: `NFC-e rejeitada pela SEFAZ: ${n.cStat} - ${n.xMotivo}` }
  } catch (e) {
    return { erro: e instanceof ErroEmissao ? e.message : `Falha na emissão: ${(e as Error).message}` }
  }
}

export async function cancelarNota(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { empresa, user } = await contexto()
  try {
    await cancelarNfce({ empresaId: empresa.id, notaId: String(fd.get('notaId')), userId: user.id, justificativa: String(fd.get('justificativa') ?? '') })
    revalidatePath('/vendas', 'layout'); revalidatePath('/notas')
    return { ok: 'NFC-e cancelada na SEFAZ.' }
  } catch (e) {
    return { erro: (e as Error).message }
  }
}

export async function inutilizar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { empresa, user, papel } = await contexto()
  if (papel !== 'dono') return { erro: 'Apenas o dono pode inutilizar numeração.' }
  try {
    const r = await inutilizarNumeracao({ empresaId: empresa.id, userId: user.id, inicial: Number(fd.get('inicial')), final: Number(fd.get('final')), justificativa: String(fd.get('justificativa') ?? '') })
    revalidatePath('/notas')
    return { ok: `Numeração inutilizada (protocolo ${r.protocolo}).` }
  } catch (e) {
    return { erro: (e as Error).message }
  }
}
