import type { Metadata } from 'next'
import { Pdv } from '@/components/pdv'
import { Aviso, Titulo } from '@/components/ui'
import { contexto } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Vender' }

export default async function Vender() {
  const { sb, empresa, podeOperar } = await contexto()
  const { data: produtos } = await sb.from('produtos').select('id, nome, sku, preco, unidade, ncm').eq('empresa_id', empresa.id).eq('ativo', true).order('nome').limit(1000)
  const { data: cert } = await sb.from('certificados').select('id').eq('empresa_id', empresa.id).eq('ativo', true).maybeSingle()
  const motivo = !cert ? 'Envie o certificado A1 em Configurações para emitir NFC-e.' : !empresa.csc_id ? 'Informe o CSC em Configurações para emitir NFC-e.' : undefined
  return (
    <>
      <Titulo sub="Monte o carrinho, veja os impostos de hoje e da reforma e emita a NFC-e.">Vender</Titulo>
      {!podeOperar ? <Aviso tom="erro">Assinatura inativa: regularize em Assinatura para voltar a vender.</Aviso> : (
        <Pdv produtos={(produtos ?? []).map((p) => ({ ...p, preco: Number(p.preco) }))} podeEmitir={!motivo} motivoSemEmissao={motivo} />
      )}
    </>
  )
}
