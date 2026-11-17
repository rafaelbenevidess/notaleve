'use client'
import { useActionState, useEffect, useState } from 'react'
import { salvarProduto } from '@/app/acoes/produtos'
import type { EstadoForm } from '@/app/acoes/auth'
import { Aviso, Botao, Campo, Entrada, Selecao } from './ui'

interface Produto { id?: string; nome?: string; sku?: string | null; ean?: string | null; ncm?: string; unidade?: string; preco?: number; cclasstrib?: string }
interface ClassTrib { codigo: string; descricao: string; tratamento: string; reducaoCbs: number; reducaoIbs: number }

export function FormProduto({ produto }: { produto?: Produto }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarProduto, undefined)
  const [ncm, setNcm] = useState(produto?.ncm ?? '')
  const [classes, setClasses] = useState<ClassTrib[]>([])
  const [ct, setCt] = useState(produto?.cclasstrib ?? '000001')
  // Resultados guardados com a chave consultada: só exibimos se ainda correspondem à entrada atual
  const [resNcm, setResNcm] = useState<{ chave: string; texto: string } | null>(null)
  const [resCompat, setResCompat] = useState<{ chave: string; valido: boolean | null } | null>(null)
  const digitos = ncm.replace(/\D/g, '')
  const infoNcm = digitos.length === 8 && resNcm?.chave === digitos ? resNcm.texto : null
  const compat = resCompat?.chave === `${digitos}|${ct}` ? resCompat.valido : null

  useEffect(() => { fetch('/api/rf/classtrib').then((r) => r.json()).then(setClasses).catch(() => setClasses([])) }, [])
  useEffect(() => {
    if (digitos.length !== 8) return
    const t = setTimeout(() => {
      fetch(`/api/rf/ncm?ncm=${digitos}`).then(async (r) => {
        const j = await r.json()
        setResNcm({ chave: digitos, texto: r.ok ? [j.posicao, j.subitem].filter(Boolean).join(' — ').replace(/<[^>]+>/g, '') || 'NCM válida' : `⚠ ${j.erro}` })
      }).catch(() => undefined)
    }, 300)
    return () => clearTimeout(t)
  }, [digitos])
  useEffect(() => {
    if (digitos.length !== 8 || ct.length !== 6) return
    const chave = `${digitos}|${ct}`
    fetch(`/api/rf/classtrib?ncm=${digitos}&cClassTrib=${ct}`).then((r) => r.json()).then((j) => setResCompat({ chave, valido: j.valido })).catch(() => undefined)
  }, [digitos, ct])

  const sel = classes.find((c) => c.codigo === ct)
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2">
      {produto?.id && <input type="hidden" name="id" value={produto.id} />}
      <div className="sm:col-span-2"><Campo rotulo="Nome do produto"><Entrada name="nome" defaultValue={produto?.nome} required /></Campo></div>
      <Campo rotulo="Código interno (SKU)"><Entrada name="sku" defaultValue={produto?.sku ?? ''} /></Campo>
      <Campo rotulo="Código de barras (EAN)"><Entrada name="ean" inputMode="numeric" defaultValue={produto?.ean ?? ''} /></Campo>
      <Campo rotulo="NCM" dica={infoNcm ?? 'Classificação fiscal da mercadoria (8 dígitos). Ex.: 61091000 camisetas de algodão.'}>
        <Entrada name="ncm" inputMode="numeric" value={ncm} onChange={(e) => setNcm(e.target.value)} required maxLength={10} />
      </Campo>
      <Campo rotulo="Preço de venda (R$)"><Entrada name="preco" inputMode="decimal" defaultValue={produto?.preco?.toFixed(2).replace('.', ',')} required /></Campo>
      <Campo rotulo="Unidade">
        <Selecao name="unidade" defaultValue={produto?.unidade ?? 'UN'}>{['UN', 'PC', 'PAR', 'KG', 'M', 'CX', 'KIT'].map((u) => <option key={u}>{u}</option>)}</Selecao>
      </Campo>
      <Campo rotulo="Classificação tributária da reforma (cClassTrib)"
        dica={sel ? `${sel.tratamento}${sel.reducaoCbs ? ` · redução CBS ${sel.reducaoCbs}% / IBS ${sel.reducaoIbs}%` : ''}${compat === false ? ' · ⚠ não se aplica a esta NCM' : compat ? ' · ✓ compatível com a NCM' : ''}` : 'Tabela oficial da Receita.'}>
        <Selecao name="cclasstrib" value={ct} onChange={(e) => setCt(e.target.value)}>
          {classes.length === 0 && <option value="000001">000001 — Tributação integral</option>}
          {classes.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.descricao.slice(0, 90)}</option>)}
        </Selecao>
      </Campo>
      {estado?.erro && <div className="sm:col-span-2"><Aviso tom="erro">{estado.erro}</Aviso></div>}
      <div className="sm:col-span-2"><Botao type="submit" disabled={pendente}>{pendente ? 'Validando na tabela oficial…' : 'Salvar produto'}</Botao></div>
    </form>
  )
}
