// Contexto da sessão: usuário logado + empresa ativa + situação da assinatura.
import 'server-only'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import { supabaseServidor } from './supabase/server'

export interface Empresa {
  id: string; cnpj: string; razao_social: string; nome_fantasia: string | null; ie: string; uf: string
  municipio_ibge: number; municipio_nome: string; logradouro: string; numero: string; bairro: string; cep: string
  crt: 1 | 2 | 3 | 4; tp_regime_ibscbs: 1 | 2 | null; c_ativ_sn: string | null; rbt12: number | null
  csc_id: string | null; nfce_serie: number; nfce_proximo_numero: number; ambiente: 'homologacao' | 'producao'
}
export interface Assinatura { status: 'trial' | 'ativa' | 'inadimplente' | 'cancelada'; trial_ate: string; proximo_vencimento: string | null; valor: number }

export const COLUNAS_EMPRESA =
  'id, cnpj, razao_social, nome_fantasia, ie, uf, municipio_ibge, municipio_nome, logradouro, numero, bairro, cep, crt, tp_regime_ibscbs, c_ativ_sn, rbt12, csc_id, nfce_serie, nfce_proximo_numero, ambiente'

export async function usuarioOuLogin() {
  await connection() // renderização por requisição (usa sessão e relógio)
  const sb = await supabaseServidor()
  const { data } = await sb.auth.getUser()
  if (!data.user) redirect('/entrar')
  return { sb, user: data.user }
}

/** Exige usuário + empresa. Sem empresa → onboarding. */
export async function contexto() {
  const { sb, user } = await usuarioOuLogin()
  const { data: membros } = await sb.from('membros').select('empresa_id, papel').order('criado_em')
  if (!membros || membros.length === 0) redirect('/onboarding')
  const preferida = (await cookies()).get('empresa')?.value
  const m = membros.find((x) => x.empresa_id === preferida) ?? membros[0]
  const { data: empresa } = await sb.from('empresas').select(COLUNAS_EMPRESA).eq('id', m.empresa_id).single()
  const { data: assinatura } = await sb.from('assinaturas').select('status, trial_ate, proximo_vencimento, valor').eq('empresa_id', m.empresa_id).single()
  const ass = assinatura as Assinatura | null
  const podeOperar = !!ass && (ass.status === 'ativa' || (ass.status === 'trial' && new Date(ass.trial_ate) > new Date()))
  return { sb, user, empresa: empresa as unknown as Empresa, papel: m.papel as 'dono' | 'vendedor', assinatura: ass, podeOperar }
}
