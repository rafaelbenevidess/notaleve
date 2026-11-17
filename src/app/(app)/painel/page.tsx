import type { Metadata } from 'next'
import Link from 'next/link'
import { brl, BotaoLink, Cartao, pct, Titulo } from '@/components/ui'
import { contexto } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Painel' }

export default async function Painel() {
  const { sb, empresa } = await contexto()
  const agora = new Date()
  const ini = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1, 3))
  const [{ data: vendas }, { data: calcs }, { data: notas }, { data: itens }, { data: cert }, { count: nProdutos }] = await Promise.all([
    sb.from('vendas').select('id, total').eq('empresa_id', empresa.id).eq('status', 'concluida').gte('data_hora', ini.toISOString()),
    sb.from('calculos').select('modo, total_tributos, vendas!inner(data_hora, status)').eq('empresa_id', empresa.id).eq('vendas.status', 'concluida').gte('vendas.data_hora', ini.toISOString()),
    sb.from('notas').select('status').eq('empresa_id', empresa.id).gte('emitida_em', ini.toISOString()),
    sb.from('venda_itens').select('descricao, total, vendas!inner(data_hora, status)').eq('empresa_id', empresa.id).eq('vendas.status', 'concluida').gte('vendas.data_hora', ini.toISOString()),
    sb.from('certificados').select('valido_ate').eq('empresa_id', empresa.id).eq('ativo', true).maybeSingle(),
    sb.from('produtos').select('id', { count: 'exact', head: true }).eq('empresa_id', empresa.id).eq('ativo', true),
  ])
  const faturamento = (vendas ?? []).reduce((s, v) => s + Number(v.total), 0)
  const soma = (m: string) => (calcs ?? []).filter((c) => c.modo === m).reduce((s, c) => s + Number(c.total_tributos), 0)
  const hoje = soma('hoje'), reforma = soma('2033')
  const autorizadas = (notas ?? []).filter((n) => n.status === 'autorizada').length
  const top = Object.entries((itens ?? []).reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.descricao]: (acc[i.descricao] ?? 0) + Number(i.total) }), {})).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const pendencias = [
    !nProdutos && { t: 'Cadastre seus produtos', href: '/produtos/novo' },
    !cert && { t: 'Envie o certificado digital A1', href: '/configuracoes' },
    !empresa.csc_id && { t: 'Informe o CSC da NFC-e', href: '/configuracoes' },
  ].filter(Boolean) as Array<{ t: string; href: string }>
  const mesNome = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return (
    <>
      <Titulo sub={`Resumo de ${mesNome}`} acao={<BotaoLink href="/vender">Nova venda</BotaoLink>}>Olá, {empresa.nome_fantasia || empresa.razao_social}</Titulo>
      {pendencias.length > 0 && (
        <Cartao titulo="Para começar" className="mb-4">
          <ul className="space-y-2 text-sm">{pendencias.map((p) => <li key={p.t}><Link className="font-medium text-marca-700 hover:underline" href={p.href}>→ {p.t}</Link></li>)}</ul>
        </Cartao>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao><p className="text-xs font-semibold uppercase text-suave">Faturamento do mês</p><p className="num mt-1 text-2xl font-bold">{brl(faturamento)}</p><p className="text-sm text-suave">{vendas?.length ?? 0} venda{(vendas?.length ?? 0) === 1 ? '' : 's'}</p></Cartao>
        <Cartao><p className="text-xs font-semibold uppercase text-suave">NFC-e autorizadas</p><p className="num mt-1 text-2xl font-bold">{autorizadas}</p><p className="text-sm text-suave">no mês</p></Cartao>
        <Cartao><p className="text-xs font-semibold uppercase text-suave">Tributos hoje</p><p className="num mt-1 text-2xl font-bold">{brl(hoje)}</p><p className="text-sm text-suave">carga {pct(faturamento ? (hoje / faturamento) * 100 : 0)}</p></Cartao>
        <Cartao className="border-marca-100 bg-marca-50"><p className="text-xs font-semibold uppercase text-marca-700">Se fosse 2033</p><p className="num mt-1 text-2xl font-bold text-marca-900">{brl(reforma)}</p><p className="text-sm text-marca-700">{reforma - hoje >= 0 ? '+' : '−'}{brl(Math.abs(reforma - hoje))} vs. hoje</p></Cartao>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Produtos mais vendidos no mês">
          {top.length ? (
            <ul className="space-y-2">
              {top.map(([nome, v]) => (
                <li key={nome} className="text-sm">
                  <div className="flex justify-between"><span>{nome}</span><span className="num font-semibold">{brl(v)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-fundo"><div className="h-1.5 rounded-full bg-marca-500" style={{ width: `${(v / top[0][1]) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-suave">Sem vendas no mês.</p>}
        </Cartao>
        <Cartao titulo="Reforma tributária: o que muda para você">
          <p className="text-sm text-suave">Comparamos cada venda com a reforma completa (2033), usando as calculadoras oficiais da Receita. {faturamento > 0 && <>No mês, a diferença seria de <strong className="text-tinta">{brl(reforma - hoje)}</strong> ({pct(faturamento ? ((reforma - hoje) / faturamento) * 100 : 0)} do faturamento).</>} Use isso para planejar preços até 2033.</p>
          <p className="mt-2 text-xs text-suave">Simulação baseada em premissas exibidas em cada venda; não substitui orientação contábil.</p>
        </Cartao>
      </div>
    </>
  )
}
