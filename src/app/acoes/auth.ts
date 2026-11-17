'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { supabaseServidor } from '@/lib/supabase/server'

export type EstadoForm = { erro?: string; ok?: string } | undefined

const credenciais = z.object({ email: z.email('E-mail inválido'), senha: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres') })

export async function entrar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const p = credenciais.safeParse({ email: fd.get('email'), senha: fd.get('senha') })
  if (!p.success) return { erro: p.error.issues[0].message }
  const sb = await supabaseServidor()
  const { error } = await sb.auth.signInWithPassword({ email: p.data.email, password: p.data.senha })
  if (error) return { erro: 'E-mail ou senha incorretos.' }
  redirect('/painel')
}

export async function cadastrar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const p = credenciais.extend({ nome: z.string().min(2, 'Informe seu nome') }).safeParse({ email: fd.get('email'), senha: fd.get('senha'), nome: fd.get('nome') })
  if (!p.success) return { erro: p.error.issues[0].message }
  if (fd.get('termos') !== 'on') return { erro: 'É preciso aceitar os termos de uso e a política de privacidade.' }
  const sb = await supabaseServidor()
  const { data, error } = await sb.auth.signUp({ email: p.data.email, password: p.data.senha, options: { data: { nome: p.data.nome } } })
  if (error) return { erro: error.message.includes('registered') ? 'Este e-mail já tem cadastro. Entre com sua senha.' : error.message }
  if (!data.session) return { ok: 'Enviamos um link de confirmação para o seu e-mail.' }
  redirect('/onboarding')
}

export async function sair() {
  const sb = await supabaseServidor()
  await sb.auth.signOut()
  redirect('/entrar')
}
