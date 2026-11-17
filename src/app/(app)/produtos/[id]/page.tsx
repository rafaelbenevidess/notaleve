import { notFound } from 'next/navigation'
import { FormProduto } from '@/components/form-produto'
import { Cartao, Titulo } from '@/components/ui'
import { contexto } from '@/lib/sessao'

export const metadata = { title: 'Editar produto' }
export default async function Editar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sb, empresa } = await contexto()
  const { data: p } = await sb.from('produtos').select('id, nome, sku, ean, ncm, unidade, preco, cclasstrib').eq('id', id).eq('empresa_id', empresa.id).maybeSingle()
  if (!p) notFound()
  return (<><Titulo>Editar produto</Titulo><Cartao><FormProduto produto={{ ...p, preco: Number(p.preco) }} /></Cartao></>)
}
