'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { buscarNcm, ncmAplicavel } from '@/lib/receita/client'
import { contexto } from '@/lib/sessao'
import { numeroBr, soDigitos } from '@/lib/util/documentos'
import type { EstadoForm } from './auth'
import type { Database } from '@/lib/supabase/database.types'

const produto = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do produto').max(120),
  sku: z.string().trim().max(60).optional(),
  ean: z.string().trim().max(14).optional(),
  ncm: z.string().regex(/^\d{8}$/, 'NCM deve ter 8 dígitos'),
  unidade: z.string().trim().min(1).max(6),
  preco: z.number({ error: 'Preço inválido' }).positive('Preço deve ser maior que zero'),
  cfop: z.string().regex(/^\d{4}$/),
  csosn: z.string().regex(/^\d{3}$/),
  cst_ibscbs: z.string().regex(/^\d{3}$/),
  cclasstrib: z.string().regex(/^\d{6}$/, 'cClassTrib deve ter 6 dígitos'),
})

async function validarFiscal(ncm: string, cClassTrib: string): Promise<string | null> {
  const hoje = new Date().toISOString().slice(0, 10)
  const info = await buscarNcm(ncm, hoje)
  if (!info) return `NCM ${ncm} não existe na tabela oficial vigente.`
  const ok = await ncmAplicavel(ncm, cClassTrib, hoje)
  if (ok === false) return `A classificação ${cClassTrib} não se aplica à NCM ${ncm} (regra REG-011 da Receita). Use 000001 (tributação integral) ou outra compatível.`
  return null
}

export async function salvarProduto(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { sb, empresa } = await contexto()
  const cClassTrib = soDigitos(String(fd.get('cclasstrib') ?? '000001'))
  const p = produto.safeParse({
    nome: fd.get('nome'), sku: String(fd.get('sku') ?? '') || undefined, ean: soDigitos(String(fd.get('ean') ?? '')) || undefined,
    ncm: soDigitos(String(fd.get('ncm') ?? '')), unidade: String(fd.get('unidade') || 'UN').toUpperCase(), preco: numeroBr(fd.get('preco')),
    cfop: String(fd.get('cfop') || '5102'), csosn: String(fd.get('csosn') || '102'), cst_ibscbs: cClassTrib.slice(0, 3), cclasstrib: cClassTrib,
  })
  if (!p.success) return { erro: p.error.issues[0].message }
  const problema = await validarFiscal(p.data.ncm, p.data.cclasstrib)
  if (problema) return { erro: problema }
  const id = String(fd.get('id') ?? '')
  const q = id
    ? sb.from('produtos').update(p.data).eq('id', id).eq('empresa_id', empresa.id)
    : sb.from('produtos').insert({ ...p.data, empresa_id: empresa.id })
  const { error } = await q
  if (error) return { erro: error.message.includes('duplicate') ? 'Já existe um produto com este código (SKU).' : error.message }
  revalidatePath('/produtos')
  redirect('/produtos')
}

export async function inativarProduto(fd: FormData) {
  const { sb, empresa } = await contexto()
  await sb.from('produtos').update({ ativo: false }).eq('id', String(fd.get('id'))).eq('empresa_id', empresa.id)
  revalidatePath('/produtos')
}

/** CSV: nome;sku;ncm;preco;unidade;cclasstrib (cabeçalho obrigatório; separador ; ou ,) */
export async function importarCsv(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { sb, empresa } = await contexto()
  const arq = fd.get('csv')
  if (!(arq instanceof File) || arq.size === 0) return { erro: 'Selecione um arquivo CSV.' }
  const linhas = (await arq.text()).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (linhas.length < 2) return { erro: 'O CSV precisa de cabeçalho e ao menos uma linha.' }
  const sep = linhas[0].includes(';') ? ';' : ','
  const cab = linhas[0].split(sep).map((c) => c.trim().toLowerCase())
  const col = (nome: string) => cab.indexOf(nome)
  if (col('nome') < 0 || col('ncm') < 0 || col('preco') < 0) return { erro: 'Cabeçalho deve conter ao menos: nome;ncm;preco (opcionais: sku;unidade;cclasstrib).' }
  const erros: string[] = []
  const validos: Array<Database['public']['Tables']['produtos']['Insert']> = []
  for (const [n, l] of linhas.slice(1).entries()) {
    const v = l.split(sep).map((x) => x.trim())
    const cct = soDigitos(v[col('cclasstrib')] ?? '') || '000001'
    const p = produto.safeParse({
      nome: v[col('nome')], sku: v[col('sku')] || undefined, ncm: soDigitos(v[col('ncm')] ?? ''), preco: numeroBr(v[col('preco')] ?? ''),
      unidade: (v[col('unidade')] || 'UN').toUpperCase(), cfop: '5102', csosn: '102', cst_ibscbs: cct.slice(0, 3), cclasstrib: cct,
    })
    if (!p.success) { erros.push(`linha ${n + 2}: ${p.error.issues[0].message}`); continue }
    const problema = await validarFiscal(p.data.ncm, p.data.cclasstrib)
    if (problema) { erros.push(`linha ${n + 2}: ${problema}`); continue }
    validos.push({ ...p.data, empresa_id: empresa.id })
  }
  if (validos.length) {
    const { error } = await sb.from('produtos').insert(validos)
    if (error) return { erro: `Falha ao gravar: ${error.message}` }
  }
  revalidatePath('/produtos')
  return erros.length
    ? { erro: `${validos.length} importado(s). ${erros.length} com problema: ${erros.slice(0, 5).join(' | ')}${erros.length > 5 ? '…' : ''}` }
    : { ok: `${validos.length} produto(s) importado(s).` }
}
