'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { supabaseServidor } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { cifrar } from '@/lib/cripto/segredos'
import { lerPfx, validarCertificado } from '@/lib/fiscal/certificado'
import { contexto } from '@/lib/sessao'
import { cnpjValido, numeroBr, soDigitos } from '@/lib/util/documentos'
import type { EstadoForm } from './auth'

const empresa = z.object({
  cnpj: z.string().refine(cnpjValido, 'CNPJ inválido'),
  razao_social: z.string().min(3, 'Informe a razão social'),
  nome_fantasia: z.string().optional(),
  ie: z.string().min(2, 'Informe a inscrição estadual'),
  uf: z.string().length(2, 'Escolha a UF'),
  municipio: z.string().regex(/^\d{7}\|.+/, 'Escolha o município'),
  logradouro: z.string().min(2, 'Informe o endereço'),
  numero: z.string().optional(),
  bairro: z.string().min(2, 'Informe o bairro'),
  cep: z.string().refine((v) => soDigitos(v).length === 8, 'CEP deve ter 8 dígitos'),
  crt: z.enum(['1', '2', '3', '4']),
  c_ativ_sn: z.string().optional(),
  rbt12: z.number().nonnegative().optional(),
})

export async function criarEmpresa(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const bruto = Object.fromEntries(fd) as Record<string, string>
  const rb = numeroBr(fd.get('rbt12'))
  const p = empresa.safeParse({ ...bruto, rbt12: Number.isNaN(rb) ? undefined : rb })
  if (!p.success) return { erro: p.error.issues[0].message }
  const d = p.data
  const [ibge, nomeMun] = d.municipio.split('|')
  const sb = await supabaseServidor()
  const { error } = await sb.rpc('criar_empresa', {
    p_cnpj: soDigitos(d.cnpj), p_razao_social: d.razao_social.trim(), p_nome_fantasia: d.nome_fantasia ?? '', p_ie: soDigitos(d.ie) || d.ie,
    p_uf: d.uf, p_municipio_ibge: Number(ibge), p_municipio_nome: nomeMun, p_logradouro: d.logradouro, p_numero: d.numero ?? '',
    p_bairro: d.bairro, p_cep: soDigitos(d.cep), p_crt: Number(d.crt), p_c_ativ_sn: d.crt === '3' ? '' : d.c_ativ_sn || '01', p_rbt12: (d.rbt12 ?? null) as number,
  })
  if (error) return { erro: error.message.includes('duplicate') ? 'Este CNPJ já está cadastrado no NotaLeve.' : `Não foi possível criar a empresa: ${error.message}` }
  redirect('/configuracoes?bemvindo=1')
}

export async function atualizarEmpresa(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { sb, empresa: e, papel } = await contexto()
  if (papel !== 'dono') return { erro: 'Apenas o dono pode alterar os dados da empresa.' }
  const rb = numeroBr(fd.get('rbt12'))
  const crt = Number(fd.get('crt'))
  if (![1, 2, 3, 4].includes(crt)) return { erro: 'Regime tributário inválido.' }
  const { error } = await sb.from('empresas').update({
    razao_social: String(fd.get('razao_social') ?? e.razao_social), nome_fantasia: String(fd.get('nome_fantasia') ?? '') || null,
    ie: String(fd.get('ie') ?? e.ie), logradouro: String(fd.get('logradouro') ?? ''), numero: String(fd.get('numero') ?? ''),
    bairro: String(fd.get('bairro') ?? ''), cep: soDigitos(String(fd.get('cep') ?? '')).padStart(8, '0'), crt,
    rbt12: Number.isNaN(rb) ? null : rb, c_ativ_sn: crt === 3 ? null : String(fd.get('c_ativ_sn') || '01'), nfce_serie: Number(fd.get('nfce_serie') || e.nfce_serie),
  }).eq('id', e.id)
  if (error) return { erro: error.message }
  revalidatePath('/', 'layout')
  return { ok: 'Dados da empresa salvos.' }
}

export async function salvarCertificado(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { empresa: e, papel, user } = await contexto()
  if (papel !== 'dono') return { erro: 'Apenas o dono pode enviar o certificado.' }
  const arquivo = fd.get('pfx')
  const senha = String(fd.get('senha') ?? '')
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: 'Selecione o arquivo .pfx ou .p12 do certificado A1.' }
  if (arquivo.size > 50_000) return { erro: 'Arquivo grande demais para um certificado A1.' }
  const buf = Buffer.from(await arquivo.arrayBuffer())
  let cert
  try { cert = lerPfx(buf, senha) } catch (err) { return { erro: (err as Error).message } }
  const problemas = validarCertificado(cert, e.cnpj)
  if (problemas.length) return { erro: problemas.join(' ') }
  const db = supabaseAdmin()
  await db.from('certificados').update({ ativo: false } as never).eq('empresa_id', e.id)
  const { error } = await db.from('certificados').insert({
    empresa_id: e.id, pfx_cifrado: cifrar(buf), senha_cifrada: cifrar(senha), cn: cert.cn, cnpj: cert.cnpj,
    valido_de: cert.validoDe.toISOString(), valido_ate: cert.validoAte.toISOString(), fingerprint_sha256: cert.fingerprintSha256,
  } as never)
  if (error) return { erro: error.message }
  await db.from('auditoria').insert({ empresa_id: e.id, user_id: user.id, acao: 'certificado.upload', detalhe: { cn: cert.cn, validoAte: cert.validoAte, fingerprint: cert.fingerprintSha256 } } as never)
  revalidatePath('/configuracoes')
  return { ok: `Certificado de ${cert.cn} salvo (válido até ${cert.validoAte.toLocaleDateString('pt-BR')}).` }
}

export async function salvarCsc(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { empresa: e, papel } = await contexto()
  if (papel !== 'dono') return { erro: 'Apenas o dono pode alterar o CSC.' }
  const id = soDigitos(String(fd.get('csc_id') ?? ''))
  const csc = String(fd.get('csc') ?? '').trim()
  if (!id || csc.length < 4) return { erro: 'Informe o ID do token e o CSC gerados no portal da SEFAZ.' }
  const { error } = await supabaseAdmin().from('empresas').update({ csc_id: id.padStart(6, '0'), csc_cifrado: cifrar(csc) } as never).eq('id', e.id)
  if (error) return { erro: error.message }
  revalidatePath('/configuracoes')
  return { ok: 'CSC salvo com segurança.' }
}

export async function trocarEmpresa(fd: FormData) {
  const { cookies } = await import('next/headers')
  ;(await cookies()).set('empresa', String(fd.get('empresa')), { httpOnly: true, sameSite: 'lax', path: '/' })
  redirect('/painel')
}
