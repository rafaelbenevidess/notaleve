import type { Metadata } from 'next'
import { ativarAssinatura } from '@/app/acoes/assinatura'
import { FormAcao } from '@/components/form-acao'
import { brl, Cartao, Selo, Titulo } from '@/components/ui'
import { contexto } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Assinatura' }

const rotulo = { trial: 'teste grátis', ativa: 'ativa', inadimplente: 'pagamento em atraso', cancelada: 'cancelada' } as const

export default async function Assinatura() {
  const { assinatura: a } = await contexto()
  if (!a) return null
  const simulado = !process.env.ASAAS_API_KEY
  return (
    <>
      <Titulo>Assinatura</Titulo>
      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Plano Loja" acao={<Selo tom={a.status === 'ativa' ? 'ok' : a.status === 'trial' ? 'neutro' : 'erro'}>{rotulo[a.status]}</Selo>}>
          <p className="num text-3xl font-bold">{brl(a.valor)}<span className="text-base font-normal text-suave">/mês</span></p>
          <ul className="mt-3 space-y-1 text-sm text-suave">
            <li>✓ NFC-e ilimitadas, direto na SEFAZ</li><li>✓ Comparativo hoje × reforma em cada venda</li><li>✓ Exportação de XMLs para o contador</li>
          </ul>
          <p className="mt-4 text-sm">
            {a.status === 'trial' && <>Teste até <strong>{new Date(a.trial_ate).toLocaleDateString('pt-BR')}</strong>.</>}
            {a.status === 'ativa' && a.proximo_vencimento && <>Próximo vencimento: <strong>{new Date(`${a.proximo_vencimento}T12:00:00`).toLocaleDateString('pt-BR')}</strong>.</>}
          </p>
          {a.status !== 'ativa' && (
            <FormAcao acao={ativarAssinatura} botao={a.status === 'trial' ? 'Ativar assinatura' : 'Regularizar pagamento'} className="mt-4 space-y-3" />
          )}
          {simulado && <p className="mt-3 text-xs text-alerta">Modo simulado: ASAAS_API_KEY não configurada — nenhuma cobrança real é feita.</p>}
        </Cartao>
        <Cartao titulo="Como funciona a cobrança">
          <p className="text-sm text-suave">A cobrança é feita pelo Asaas (Pix, boleto ou cartão). A primeira mensalidade vence ao fim do teste grátis. Com pagamento em atraso, o acesso fica somente para consulta até a regularização — suas notas e XMLs continuam disponíveis.</p>
        </Cartao>
      </div>
    </>
  )
}
