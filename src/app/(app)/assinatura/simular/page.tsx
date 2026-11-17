import { simularPagamento } from '@/app/acoes/assinatura'
import { Botao, Cartao, Titulo } from '@/components/ui'

export const metadata = { title: 'Pagamento (simulado)' }

export default async function Simular({ searchParams }: { searchParams: Promise<{ sub?: string }> }) {
  const { sub } = await searchParams
  return (
    <>
      <Titulo sub="Ambiente local: simula o checkout do Asaas e o webhook de pagamento.">Pagamento simulado</Titulo>
      <Cartao>
        <p className="mb-4 text-sm text-suave">Assinatura <code>{sub}</code>. Escolha o resultado a simular:</p>
        <div className="flex flex-wrap gap-2">
          {[['PAYMENT_CONFIRMED', 'Pagamento confirmado', 'primario'], ['PAYMENT_OVERDUE', 'Pagamento vencido', 'secundario'], ['SUBSCRIPTION_DELETED', 'Cancelar assinatura', 'perigo']].map(([ev, r, v]) => (
            <form key={ev} action={simularPagamento}><input type="hidden" name="sub" value={sub} /><input type="hidden" name="evento" value={ev} /><Botao variante={v as 'primario'}>{r}</Botao></form>
          ))}
        </div>
      </Cartao>
    </>
  )
}
