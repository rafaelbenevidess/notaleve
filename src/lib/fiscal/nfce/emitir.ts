// Orquestra a emissão/cancelamento de NFC-e a partir de uma venda (RF-30..34).
// Roda só no servidor, com service_role (lê certificado/CSC cifrados).
import 'server-only'
import { decifrar, decifrarTexto } from '@/lib/cripto/segredos'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ResultadoCalculo } from '@/lib/tributos/tipos'
import { assinarXml } from '../assinatura'
import { CertificadoA1, lerPfx } from '../certificado'
import { xmlCancelamento, xmlInutilizacao } from '../eventos'
import { autorizar, enviarEvento, inutilizar, montarNfeProc } from '../sefaz'
import { resolverUrls } from '../webservices'
import { gerarGruposIbsCbs } from './ibscbs'
import { prepararNfce } from './preparar'
import { ItemNfce } from './xml'

export const VERSAO_APP = 'NotaLeve 0.1.0'

export class ErroEmissao extends Error {}

type Admin = ReturnType<typeof supabaseAdmin>

async function carregarEmitente(db: Admin, empresaId: string) {
  const { data: e, error } = await db.from('empresas').select('*').eq('id', empresaId).single()
  if (error || !e) throw new ErroEmissao('Empresa não encontrada.')
  const { data: c } = await db.from('certificados').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('criado_em', { ascending: false }).limit(1).maybeSingle()
  if (!c) throw new ErroEmissao('Cadastre o certificado digital A1 em Configurações antes de emitir.')
  if (new Date(c.valido_ate) < new Date()) throw new ErroEmissao('O certificado digital está vencido. Envie um novo em Configurações.')
  if (!e.csc_cifrado || !e.csc_id) throw new ErroEmissao('Informe o CSC e o ID do token (QR Code) em Configurações.')
  let cert: CertificadoA1
  try {
    cert = lerPfx(decifrar(c.pfx_cifrado), decifrarTexto(c.senha_cifrada))
  } catch {
    throw new ErroEmissao('Não foi possível abrir o certificado armazenado. Envie-o novamente.')
  }
  return { e, cert, csc: { id: e.csc_id as string, codigo: decifrarTexto(e.csc_cifrado) } }
}

async function auditar(db: Admin, empresaId: string, userId: string | null, acao: string, detalhe: Record<string, unknown>) {
  await db.from('auditoria').insert({ empresa_id: empresaId, user_id: userId, acao, detalhe } as never)
}

export async function emitirNfceDaVenda(p: { empresaId: string; vendaId: string; userId: string }) {
  const db = supabaseAdmin()
  const { data: pode } = await db.rpc('empresa_pode_operar', { p_empresa: p.empresaId } as never)
  if (!pode) throw new ErroEmissao('Assinatura inativa: regularize o pagamento para emitir notas.')

  const { data: jaTem } = await db.from('notas').select('id, status').eq('venda_id', p.vendaId).eq('status', 'autorizada').maybeSingle()
  if (jaTem) throw new ErroEmissao('Esta venda já possui NFC-e autorizada.')

  const { e, cert, csc } = await carregarEmitente(db, p.empresaId)
  const { data: venda } = await db.from('vendas').select('*').eq('id', p.vendaId).eq('empresa_id', p.empresaId).single()
  if (!venda) throw new ErroEmissao('Venda não encontrada.')
  const { data: itens } = await db.from('venda_itens').select('*').eq('venda_id', p.vendaId).order('numero_item')
  const { data: pagamentos } = await db.from('venda_pagamentos').select('*').eq('venda_id', p.vendaId)
  const { data: calc } = await db.from('calculos').select('resultado').eq('venda_id', p.vendaId).eq('modo', 'hoje').order('criado_em', { ascending: false }).limit(1).maybeSingle()
  if (!itens?.length || !pagamentos?.length) throw new ErroEmissao('Venda sem itens ou sem pagamento.')
  const hoje = calc?.resultado as ResultadoCalculo | undefined

  const ambiente: 1 | 2 = e.ambiente === 'producao' ? 1 : 2
  const { nome: autorizador, urls } = resolverUrls(e.uf, e.ambiente as 'homologacao' | 'producao')
  const emissao = new Date()

  // Grupo IBS/CBS oficial — obrigatório para o regime normal (NT 2025.002); Simples a partir de 2027 (NT 2026.005)
  let grupos: Awaited<ReturnType<typeof gerarGruposIbsCbs>> | null = null
  if (e.crt === 3) {
    grupos = await gerarGruposIbsCbs({
      uf: e.uf, municipioIbge: e.municipio_ibge, emissao,
      itens: itens.map((i) => ({ numero: i.numero_item, ncm: i.ncm, cst: i.cst_ibscbs, cClassTrib: i.cclasstrib, base: Number(i.total), quantidade: Number(i.quantidade), unidade: i.unidade })),
    })
  }

  const itensNfce: ItemNfce[] = itens.map((i) => {
    const t = hoje?.itens.find((x) => x.numero === i.numero_item)
    const base = Number(i.total)
    const pisCofins = t?.tributos.pisCofins ?? 0
    return {
      numero: i.numero_item, codigo: i.produto_id ? String(i.produto_id).slice(0, 8).toUpperCase() : `ITEM${i.numero_item}`,
      descricao: i.descricao, ncm: i.ncm, cfop: i.cfop, unidade: i.unidade, quantidade: Number(i.quantidade),
      valorUnitario: Number(i.preco_unitario), desconto: Number(i.desconto), csosn: i.csosn,
      icms: { base, aliquota: base ? Math.round(((t?.tributos.icms ?? 0) / base) * 10000) / 100 : 0, valor: t?.tributos.icms ?? 0 },
      pis: { aliquota: 0.65, valor: Math.round(pisCofins * (0.65 / 3.65) * 100) / 100 },
      cofins: { aliquota: 3, valor: Math.round(pisCofins * (3 / 3.65) * 100) / 100 },
      grupoIbsCbs: grupos?.porItem.get(i.numero_item) ?? null,
      valorTributos: t?.total ?? 0,
    }
  })

  const { data: num, error: errNum } = await db.rpc('reservar_numero_nfce', { p_empresa: p.empresaId } as never)
  const reservado = (num as Array<{ serie: number; numero: number }> | null)?.[0]
  if (errNum || !reservado) throw new ErroEmissao('Falha ao reservar a numeração da NFC-e.')

  const prep = prepararNfce(
    {
      emitente: { cnpj: e.cnpj, razaoSocial: e.razao_social, nomeFantasia: e.nome_fantasia, ie: e.ie, uf: e.uf, municipioIbge: e.municipio_ibge,
        municipioNome: e.municipio_nome, logradouro: e.logradouro, numero: e.numero, bairro: e.bairro, cep: e.cep, crt: e.crt as 1 | 2 | 3 | 4 },
      ambiente, serie: reservado.serie, numero: reservado.numero, emissao, itens: itensNfce,
      pagamentos: pagamentos.map((x) => ({ meio: x.meio, valor: Number(x.valor) })),
      totalIbsCbs: grupos?.total ?? null,
      respTec: { cnpj: process.env.RESP_TEC_CNPJ ?? '00000000000000', contato: process.env.RESP_TEC_CONTATO ?? 'NotaLeve', email: process.env.RESP_TEC_EMAIL ?? 'contato@notaleve.local', fone: process.env.RESP_TEC_FONE ?? '11999999999' },
      versaoAplicativo: VERSAO_APP,
    },
    cert, csc, urls,
  )
  await auditar(db, p.empresaId, p.userId, 'certificado.uso', { finalidade: 'autorizacao', chave: prep.chave, autorizador })

  let ret
  try {
    ret = await autorizar(urls.autorizacao, String(Date.now()).slice(-15), prep.xmlAssinado, cert)
  } catch (err) {
    // Sem resposta: registra como 'enviada' para conciliação posterior (contingência fica para a fase 6)
    const { data: n } = await db.from('notas').insert({
      empresa_id: p.empresaId, venda_id: p.vendaId, serie: reservado.serie, numero: reservado.numero, chave: prep.chave,
      status: 'enviada', ambiente: e.ambiente, x_motivo: (err as Error).message, xml: prep.xmlAssinado, qr_code_url: prep.qrCode,
    } as never).select('id').single()
    throw new ErroEmissao(`${(err as Error).message}. A nota ${reservado.numero} ficou pendente${n ? '' : ''}; tente novamente em instantes.`)
  }

  const autorizada = ret.cStat === '100' || ret.cStat === '150'
  const { data: nota, error: errNota } = await db.from('notas').insert({
    empresa_id: p.empresaId, venda_id: p.vendaId, serie: reservado.serie, numero: reservado.numero, chave: prep.chave,
    status: autorizada ? 'autorizada' : 'rejeitada', ambiente: e.ambiente, c_stat: ret.cStat, x_motivo: ret.xMotivo,
    protocolo: ret.protocolo, xml: autorizada && ret.protNFe ? montarNfeProc(prep.xmlAssinado, ret.protNFe) : prep.xmlAssinado,
    qr_code_url: prep.qrCode,
  } as never).select('id').single()
  if (errNota) throw new ErroEmissao(`Nota processada pela SEFAZ, mas falhou ao salvar: ${errNota.message}`)
  await db.from('nota_eventos').insert({
    nota_id: nota!.id, empresa_id: p.empresaId, tipo: 'autorizacao', request_xml: prep.xmlAssinado, response_xml: ret.respostaXml, c_stat: ret.cStat, x_motivo: ret.xMotivo,
  } as never)
  return { notaId: nota!.id as string, status: autorizada ? 'autorizada' : 'rejeitada', cStat: ret.cStat, xMotivo: ret.xMotivo, chave: prep.chave, numero: reservado.numero }
}

export async function cancelarNfce(p: { empresaId: string; notaId: string; userId: string; justificativa: string }) {
  const db = supabaseAdmin()
  const { data: nota } = await db.from('notas').select('*').eq('id', p.notaId).eq('empresa_id', p.empresaId).single()
  if (!nota) throw new ErroEmissao('Nota não encontrada.')
  if (nota.status !== 'autorizada') throw new ErroEmissao('Só é possível cancelar notas autorizadas.')
  if (Date.now() - new Date(nota.emitida_em).getTime() > 24 * 3600_000) throw new ErroEmissao('Prazo de cancelamento da NFC-e (24 horas) expirado.')
  const { e, cert } = await carregarEmitente(db, p.empresaId)
  const { urls } = resolverUrls(e.uf, e.ambiente as 'homologacao' | 'producao')
  const ev = xmlCancelamento({ chave: nota.chave, cnpj: e.cnpj, ambiente: e.ambiente === 'producao' ? 1 : 2, protocolo: nota.protocolo ?? '', justificativa: p.justificativa })
  const assinado = assinarXml(ev.xml, cert, 'infEvento', 'evento')
  await auditar(db, p.empresaId, p.userId, 'certificado.uso', { finalidade: 'cancelamento', chave: nota.chave })
  const ret = await enviarEvento(urls.evento, String(Date.now()).slice(-15), assinado, cert)
  await db.from('nota_eventos').insert({ nota_id: nota.id, empresa_id: p.empresaId, tipo: 'cancelamento', request_xml: assinado, response_xml: ret.respostaXml, c_stat: ret.cStat, x_motivo: ret.xMotivo } as never)
  if (ret.cStat !== '135' && ret.cStat !== '155') throw new ErroEmissao(`SEFAZ recusou o cancelamento: ${ret.cStat} - ${ret.xMotivo}`)
  await db.from('notas').update({ status: 'cancelada' } as never).eq('id', nota.id)
  await db.from('vendas').update({ status: 'cancelada' } as never).eq('id', nota.venda_id)
  return { cStat: ret.cStat, xMotivo: ret.xMotivo }
}

export async function inutilizarNumeracao(p: { empresaId: string; userId: string; inicial: number; final: number; justificativa: string }) {
  const db = supabaseAdmin()
  const { e, cert } = await carregarEmitente(db, p.empresaId)
  if (p.final < p.inicial) throw new ErroEmissao('Número final menor que o inicial.')
  const { urls } = resolverUrls(e.uf, e.ambiente as 'homologacao' | 'producao')
  const inut = xmlInutilizacao({ uf: e.uf, cnpj: e.cnpj, ambiente: e.ambiente === 'producao' ? 1 : 2, ano: new Date().getFullYear(), serie: e.nfce_serie, numeroInicial: p.inicial, numeroFinal: p.final, justificativa: p.justificativa })
  const assinado = assinarXml(inut.xml, cert, 'infInut', 'inutNFe')
  await auditar(db, p.empresaId, p.userId, 'certificado.uso', { finalidade: 'inutilizacao', faixa: [p.inicial, p.final] })
  const ret = await inutilizar(urls.inutilizacao, assinado, cert)
  await db.from('nota_eventos').insert({ empresa_id: p.empresaId, tipo: 'inutilizacao', request_xml: assinado, response_xml: ret.respostaXml, c_stat: ret.cStat, x_motivo: ret.xMotivo } as never)
  if (ret.cStat !== '102') throw new ErroEmissao(`SEFAZ recusou a inutilização: ${ret.cStat} - ${ret.xMotivo}`)
  return ret
}
