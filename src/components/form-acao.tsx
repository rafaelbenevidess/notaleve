'use client'
import { useActionState, type ReactNode } from 'react'
import type { EstadoForm } from '@/app/acoes/auth'
import { Aviso, Botao } from './ui'

export function FormAcao({ acao, botao, children, className, variante, encType }: {
  acao: (s: EstadoForm, fd: FormData) => Promise<EstadoForm>
  botao: string
  children?: ReactNode
  className?: string
  variante?: 'primario' | 'secundario' | 'perigo'
  encType?: string
}) {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(acao, undefined)
  return (
    <form action={formAction} className={className ?? 'space-y-4'} encType={encType}>
      {children}
      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      <Botao type="submit" variante={variante} disabled={pendente}>{pendente ? 'Processando…' : botao}</Botao>
    </form>
  )
}
