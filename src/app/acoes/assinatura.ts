'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { iniciarAssinatura, processarEventoAsaas } from '@/lib/asaas'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { contexto } from '@/lib/sessao'
import type { EstadoForm } from './auth'

export async function ativarAssinatura(_estado: EstadoForm): Promise<EstadoForm> { // eslint-disable-line @typescript-eslint/no-unused-vars
  const { empresa, user, assinatura, papel } = await contexto()
  if (papel !== 'dono') return { erro: 'Apenas o dono pode gerenciar a assinatura.' }
  const db = supabaseAdmin()
  const { data: atual } = await db.from('assinaturas').select('asaas_subscription_id').eq('empresa_id', empresa.id).single()
  let link: string
  try {
    const trialFim = assinatura ? new Date(assinatura.trial_ate) : new Date()
    const r = await iniciarAssinatura({ empresaId: empresa.id, nome: empresa.razao_social, cnpj: empresa.cnpj, email: user.email!, valor: assinatura?.valor ?? 59.9, primeiroVencimento: trialFim > new Date() ? trialFim : new Date() })
    if (!atual?.asaas_subscription_id) await db.from('assinaturas').update({ asaas_customer_id: r.customerId, asaas_subscription_id: r.subscriptionId } as never).eq('empresa_id', empresa.id)
    link = r.simulado ? `/assinatura/simular?sub=${atual?.asaas_subscription_id ?? r.subscriptionId}` : r.linkPagamento
  } catch (e) {
    return { erro: (e as Error).message }
  }
  redirect(link)
}

/** Modo simulado (sem ASAAS_API_KEY): aplica o mesmo processamento do webhook. */
export async function simularPagamento(fd: FormData) {
  if (process.env.ASAAS_API_KEY) throw new Error('Simulação desabilitada quando o Asaas real está configurado.')
  const { empresa } = await contexto()
  const { data } = await supabaseAdmin().from('assinaturas').select('asaas_subscription_id').eq('empresa_id', empresa.id).single()
  const sub = (data as { asaas_subscription_id: string | null } | null)?.asaas_subscription_id
  if (!sub || sub !== fd.get('sub')) throw new Error('Assinatura não encontrada.')
  await processarEventoAsaas({ event: String(fd.get('evento') ?? 'PAYMENT_CONFIRMED'), payment: { id: `pay_sim_${Date.now()}`, subscription: sub, status: 'CONFIRMED', dueDate: new Date().toISOString().slice(0, 10) } })
  revalidatePath('/', 'layout')
  redirect('/assinatura')
}
