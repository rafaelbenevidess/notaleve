'use client'
import Link from 'next/link'
import { useActionState } from 'react'
import { cadastrar, entrar, EstadoForm } from '@/app/acoes/auth'
import { Aviso, Botao, Campo, Entrada } from './ui'

export function FormAuth({ modo }: { modo: 'entrar' | 'cadastro' }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(modo === 'entrar' ? entrar : cadastrar, undefined)
  return (
    <form action={acao} className="space-y-4">
      {modo === 'cadastro' && <Campo rotulo="Seu nome"><Entrada name="nome" autoComplete="name" required /></Campo>}
      <Campo rotulo="E-mail"><Entrada name="email" type="email" autoComplete="email" required /></Campo>
      <Campo rotulo="Senha" dica={modo === 'cadastro' ? 'Mínimo de 8 caracteres.' : undefined}>
        <Entrada name="senha" type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required minLength={8} />
      </Campo>
      {modo === 'cadastro' && (
        <label className="flex items-start gap-2 text-sm text-suave">
          <input type="checkbox" name="termos" className="mt-0.5 h-4 w-4 accent-marca-600" />
          <span>Li e aceito os <Link className="underline" href="/termos">termos de uso e a política de privacidade</Link>.</span>
        </label>
      )}
      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      <Botao type="submit" disabled={pendente} className="w-full">{pendente ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta grátis'}</Botao>
      <p className="text-center text-sm text-suave">
        {modo === 'entrar' ? <>Ainda não tem conta? <Link className="font-semibold text-marca-700" href="/cadastro">Cadastre-se</Link></> : <>Já tem conta? <Link className="font-semibold text-marca-700" href="/entrar">Entrar</Link></>}
      </p>
    </form>
  )
}
