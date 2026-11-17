'use client'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { finalizarVenda, simularVenda } from '@/app/acoes/vendas'
import type { ComparativoVenda } from '@/lib/tributos/tipos'
import { Comparativo } from './comparativo'
import { Aviso, Botao, Entrada, Selecao } from './ui'

interface Produto { id: string; nome: string; sku: string | null; preco: number; unidade: string; ncm: string }
interface Linha { produto: Produto; quantidade: number; desconto: number }

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const MEIOS = [['17', 'Pix'], ['03', 'Crédito'], ['04', 'Débito'], ['01', 'Dinheiro'], ['99', 'Outros']] as const

export function Pdv({ produtos, podeEmitir, motivoSemEmissao }: { produtos: Produto[]; podeEmitir: boolean; motivoSemEmissao?: string }) {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [meio, setMeio] = useState<string>('17')
  const [recebido, setRecebido] = useState('')
  const [comp, setComp] = useState<ComparativoVenda | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return (q ? produtos.filter((p) => p.nome.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)) : produtos).slice(0, 30)
  }, [busca, produtos])
  const total = linhas.reduce((s, l) => s + l.quantidade * l.produto.preco - l.desconto, 0)
  const valorRecebido = meio === '01' && recebido ? Number(recebido.replace(/\./g, '').replace(',', '.')) : total
  const troco = Math.max(0, valorRecebido - total)

  const alterar = (fn: (ls: Linha[]) => Linha[]) => { setLinhas(fn); setComp(null) }
  const adicionar = (p: Produto) => alterar((ls) => {
    const i = ls.findIndex((l) => l.produto.id === p.id)
    if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, quantidade: l.quantidade + 1 } : l))
    return [...ls, { produto: p, quantidade: 1, desconto: 0 }]
  })
  const carrinho = (emitir: boolean) => ({
    itens: linhas.map((l) => ({ produtoId: l.produto.id, quantidade: l.quantidade, desconto: l.desconto })),
    pagamentos: [{ meio: meio as '01', valor: Math.round(valorRecebido * 100) / 100 }],
    emitir,
  })
  const calcular = () => iniciar(async () => {
    setErro(null)
    const r = await simularVenda(carrinho(false))
    if (r.ok) setComp(r.comparativo); else setErro(r.erro)
  })
  const finalizar = (emitir: boolean) => iniciar(async () => {
    setErro(null)
    const r = await finalizarVenda(carrinho(emitir))
    if (!r.ok) { setErro(r.erro ?? 'Falha ao finalizar.'); return }
    const q = new URLSearchParams({ nova: '1' })
    if (r.avisoNota) q.set('aviso', r.avisoNota)
    router.push(`/vendas/${r.vendaId}?${q}`)
  })

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
      <section aria-label="Produtos">
        <Entrada autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto por nome ou código…" aria-label="Buscar produto" />
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {filtrados.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => adicionar(p)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-linha bg-white px-3 py-3 text-left hover:border-marca-500">
                <span><span className="block text-sm font-medium">{p.nome}</span><span className="block text-xs text-suave">{p.sku ?? p.ncm}</span></span>
                <span className="num text-sm font-semibold">{brl(p.preco)}</span>
              </button>
            </li>
          ))}
          {produtos.length === 0 && <li className="text-sm text-suave">Cadastre produtos para começar a vender.</li>}
        </ul>
      </section>
      <aside aria-label="Carrinho" className="space-y-4 lg:sticky lg:top-32 lg:self-start">
        <div className="rounded-xl border border-linha bg-white p-4">
          <h2 className="mb-2 font-semibold">Carrinho</h2>
          {linhas.length === 0 && <p className="py-6 text-center text-sm text-suave">Toque num produto para adicionar.</p>}
          <ul className="divide-y divide-linha">
            {linhas.map((l, i) => (
              <li key={l.produto.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{l.produto.nome}</p><p className="num text-xs text-suave">{brl(l.produto.preco)} × {l.quantidade}</p></div>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Diminuir" onClick={() => alterar((ls) => ls.flatMap((x, j) => (j === i ? (x.quantidade > 1 ? [{ ...x, quantidade: x.quantidade - 1 }] : []) : [x])))} className="h-8 w-8 rounded-lg border border-linha">−</button>
                  <span className="num w-6 text-center text-sm">{l.quantidade}</span>
                  <button type="button" aria-label="Aumentar" onClick={() => alterar((ls) => ls.map((x, j) => (j === i ? { ...x, quantidade: x.quantidade + 1 } : x)))} className="h-8 w-8 rounded-lg border border-linha">+</button>
                </div>
                <span className="num w-20 text-right text-sm font-semibold">{brl(l.quantidade * l.produto.preco - l.desconto)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t border-linha pt-3"><span className="font-semibold">Total</span><span className="num text-2xl font-bold">{brl(total)}</span></div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Selecao value={meio} onChange={(e) => setMeio(e.target.value)} aria-label="Forma de pagamento">{MEIOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</Selecao>
            {meio === '01' && <Entrada value={recebido} onChange={(e) => setRecebido(e.target.value)} placeholder="Recebido R$" inputMode="decimal" aria-label="Valor recebido" />}
          </div>
          {meio === '01' && troco > 0 && <p className="num mt-2 text-sm">Troco: <strong>{brl(troco)}</strong></p>}
        </div>
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        <div className="grid gap-2">
          <Botao variante="secundario" disabled={!linhas.length || pendente} onClick={calcular}>{pendente && !comp ? 'Calculando…' : 'Ver impostos: hoje × 2033'}</Botao>
          <Botao disabled={!linhas.length || pendente || !podeEmitir} onClick={() => finalizar(true)}>{pendente ? 'Processando…' : 'Finalizar e emitir NFC-e'}</Botao>
          <Botao variante="fantasma" disabled={!linhas.length || pendente} onClick={() => finalizar(false)}>Finalizar sem nota</Botao>
          {!podeEmitir && motivoSemEmissao && <p className="text-xs text-alerta">{motivoSemEmissao}</p>}
        </div>
        {comp && <Comparativo c={comp} />}
      </aside>
    </div>
  )
}
