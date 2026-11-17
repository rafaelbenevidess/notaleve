import type { Metadata } from 'next'
import Link from 'next/link'
import { importarCsv, inativarProduto } from '@/app/acoes/produtos'
import { FormAcao } from '@/components/form-acao'
import { brl, BotaoLink, Cartao, Entrada, Titulo } from '@/components/ui'
import { contexto } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Produtos' }

export default async function Produtos({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { sb, empresa } = await contexto()
  const { q } = await searchParams
  let consulta = sb.from('produtos').select('id, nome, sku, ncm, preco, unidade, cclasstrib').eq('empresa_id', empresa.id).eq('ativo', true).order('nome').limit(200)
  if (q) consulta = consulta.or(`nome.ilike.%${q.replace(/[%,()]/g, '')}%,sku.ilike.%${q.replace(/[%,()]/g, '')}%`)
  const { data: produtos } = await consulta
  return (
    <>
      <Titulo sub="Cadastro validado nas tabelas oficiais da Receita (NCM e cClassTrib)." acao={<BotaoLink href="/produtos/novo">Novo produto</BotaoLink>}>Produtos</Titulo>
      <form className="mb-4"><Entrada name="q" defaultValue={q} placeholder="Buscar por nome ou código…" aria-label="Buscar produtos" /></form>
      <div className="overflow-x-auto rounded-xl border border-linha bg-white">
        <table className="w-full text-sm">
          <thead className="bg-fundo text-left text-xs uppercase text-suave">
            <tr><th className="px-4 py-3">Produto</th><th className="px-4 py-3">NCM</th><th className="px-4 py-3">cClassTrib</th><th className="px-4 py-3 text-right">Preço</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {(produtos ?? []).map((p) => (
              <tr key={p.id} className="border-t border-linha">
                <td className="px-4 py-3"><Link className="font-medium hover:underline" href={`/produtos/${p.id}`}>{p.nome}</Link>{p.sku && <span className="block text-xs text-suave">{p.sku}</span>}</td>
                <td className="num px-4 py-3">{p.ncm}</td>
                <td className="num px-4 py-3">{p.cclasstrib}</td>
                <td className="num px-4 py-3 text-right">{brl(p.preco)}<span className="text-xs text-suave"> /{p.unidade}</span></td>
                <td className="px-4 py-3 text-right"><form action={inativarProduto}><input type="hidden" name="id" value={p.id} /><button className="text-xs text-suave hover:text-erro">remover</button></form></td>
              </tr>
            ))}
            {!produtos?.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-suave">Nenhum produto ainda. Cadastre o primeiro ou importe um CSV.</td></tr>}
          </tbody>
        </table>
      </div>
      <Cartao titulo="Importar planilha (CSV)" className="mt-6">
        <p className="mb-3 text-sm text-suave">Colunas: <code>nome;sku;ncm;preco;unidade;cclasstrib</code> — cada linha é validada na tabela oficial.</p>
        <FormAcao acao={importarCsv} botao="Importar" variante="secundario"><Entrada type="file" name="csv" accept=".csv,text/csv" required /></FormAcao>
      </Cartao>
    </>
  )
}
