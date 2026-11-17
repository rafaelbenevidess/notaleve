// Cobrança da assinatura via Asaas (ADR-0006). Sem ASAAS_API_KEY → modo simulado, sem rede.
import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

const simulado = () => !process.env.ASAAS_API_KEY
const base = () => process.env.ASAAS_API_URL ?? 'https://api-sandbox.asaas.com/v3'

async function asaas<T>(caminho: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${base()}${caminho}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', access_token: process.env.ASAAS_API_KEY!, 'User-Agent': 'notaleve', ...(init?.headers ?? {}) },
    cache: 'no-store',
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Asaas: ${(body as { errors?: Array<{ description: string }> }).errors?.[0]?.description ?? `HTTP ${r.status}`}`)
  return body as T
}

export interface ResultadoAssinatura { customerId: string; subscriptionId: string; linkPagamento: string; simulado: boolean }

/** Cria cliente + assinatura mensal no Asaas, com 1º vencimento no fim do trial. */
export async function iniciarAssinatura(p: { empresaId: string; nome: string; cnpj: string; email: string; valor: number; primeiroVencimento: Date }): Promise<ResultadoAssinatura> {
  const venc = p.primeiroVencimento.toISOString().slice(0, 10)
  if (simulado()) {
    const sub = `sub_sim_${p.empresaId.slice(0, 8)}`
    return { customerId: `cus_sim_${p.empresaId.slice(0, 8)}`, subscriptionId: sub, linkPagamento: `/assinatura/simular?sub=${sub}`, simulado: true }
  }
  const cliente = await asaas<{ id: string }>('/customers', {
    method: 'POST', body: JSON.stringify({ name: p.nome, cpfCnpj: p.cnpj, email: p.email, externalReference: p.empresaId, notificationDisabled: false }),
  })
  const sub = await asaas<{ id: string }>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ customer: cliente.id, billingType: 'UNDEFINED', value: p.valor, nextDueDate: venc, cycle: 'MONTHLY', description: 'NotaLeve — plano Loja', externalReference: p.empresaId }),
  })
  const pagamentos = await asaas<{ data: Array<{ invoiceUrl: string }> }>(`/subscriptions/${sub.id}/payments`)
  return { customerId: cliente.id, subscriptionId: sub.id, linkPagamento: pagamentos.data[0]?.invoiceUrl ?? 'https://sandbox.asaas.com', simulado: false }
}

export interface EventoAsaas {
  event: string
  payment?: { id: string; subscription?: string; status: string; dueDate?: string; value?: number }
  subscription?: { id: string; status?: string }
}

/** Aplica um evento do webhook à tabela assinaturas. Idempotente. */
export async function processarEventoAsaas(ev: EventoAsaas): Promise<{ aplicado: boolean; status?: string }> {
  const subId = ev.payment?.subscription ?? ev.subscription?.id
  if (!subId) return { aplicado: false }
  const mapa: Record<string, 'ativa' | 'inadimplente' | 'cancelada'> = {
    PAYMENT_CONFIRMED: 'ativa', PAYMENT_RECEIVED: 'ativa', PAYMENT_OVERDUE: 'inadimplente',
    PAYMENT_REFUNDED: 'inadimplente', PAYMENT_CHARGEBACK_REQUESTED: 'inadimplente',
    SUBSCRIPTION_DELETED: 'cancelada', SUBSCRIPTION_INACTIVATED: 'cancelada',
  }
  const status = mapa[ev.event]
  if (!status) return { aplicado: false }
  const atual: Record<string, unknown> = { status, atualizado_em: new Date().toISOString() }
  if (status === 'ativa' && ev.payment?.dueDate) {
    const prox = new Date(`${ev.payment.dueDate}T12:00:00Z`)
    prox.setUTCMonth(prox.getUTCMonth() + 1)
    atual.proximo_vencimento = prox.toISOString().slice(0, 10)
  }
  const { data, error } = await supabaseAdmin().from('assinaturas').update(atual as never).eq('asaas_subscription_id', subId).select('empresa_id')
  if (error) throw error
  return { aplicado: (data?.length ?? 0) > 0, status }
}
