// Componentes de interface compartilhados (sem dependências externas).
import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ')

export function Botao({ variante = 'primario', className, ...p }: ComponentProps<'button'> & { variante?: 'primario' | 'secundario' | 'perigo' | 'fantasma' }) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-500',
        variante === 'primario' && 'bg-marca-600 text-white hover:bg-marca-700',
        variante === 'secundario' && 'border border-linha bg-white text-tinta hover:bg-fundo',
        variante === 'perigo' && 'bg-erro text-white hover:opacity-90',
        variante === 'fantasma' && 'text-marca-700 hover:bg-marca-50',
        className,
      )}
    />
  )
}

export function BotaoLink({ variante = 'primario', className, ...p }: ComponentProps<typeof Link> & { variante?: 'primario' | 'secundario' }) {
  return (
    <Link
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
        variante === 'primario' ? 'bg-marca-600 text-white hover:bg-marca-700' : 'border border-linha bg-white text-tinta hover:bg-fundo',
        className,
      )}
    />
  )
}

export function Campo({ rotulo, dica, erro, children }: { rotulo: string; dica?: ReactNode; erro?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-tinta">{rotulo}</span>
      {children}
      {dica && !erro && <span className="mt-1 block text-xs text-suave">{dica}</span>}
      {erro && <span className="mt-1 block text-xs text-erro">{erro}</span>}
    </label>
  )
}

const baseInput = 'w-full rounded-lg border border-linha bg-white px-3 py-2.5 text-sm outline-none transition focus:border-marca-500 focus:ring-2 focus:ring-marca-100'
export const Entrada = ({ className, ...p }: ComponentProps<'input'>) => <input {...p} className={cx(baseInput, className)} />
export const Selecao = ({ className, ...p }: ComponentProps<'select'>) => <select {...p} className={cx(baseInput, className)} />
export const AreaTexto = ({ className, ...p }: ComponentProps<'textarea'>) => <textarea {...p} className={cx(baseInput, className)} />

export function Cartao({ titulo, acao, children, className }: { titulo?: ReactNode; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-linha bg-white p-4 sm:p-5', className)}>
      {(titulo || acao) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {titulo && <h2 className="text-base font-semibold">{titulo}</h2>}
          {acao}
        </header>
      )}
      {children}
    </section>
  )
}

export function Selo({ tom = 'neutro', children }: { tom?: 'neutro' | 'ok' | 'alerta' | 'erro'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        tom === 'neutro' && 'bg-fundo text-suave',
        tom === 'ok' && 'bg-marca-100 text-marca-700',
        tom === 'alerta' && 'bg-amber-100 text-alerta',
        tom === 'erro' && 'bg-red-100 text-erro',
      )}
    >
      {children}
    </span>
  )
}

export function Aviso({ tom = 'info', children }: { tom?: 'info' | 'alerta' | 'erro' | 'ok'; children: ReactNode }) {
  return (
    <div
      role={tom === 'erro' ? 'alert' : 'status'}
      className={cx(
        'rounded-lg border px-3 py-2.5 text-sm',
        tom === 'info' && 'border-linha bg-white text-suave',
        tom === 'alerta' && 'border-amber-200 bg-amber-50 text-alerta',
        tom === 'erro' && 'border-red-200 bg-red-50 text-erro',
        tom === 'ok' && 'border-marca-100 bg-marca-50 text-marca-700',
      )}
    >
      {children}
    </div>
  )
}

export function Titulo({ children, sub, acao }: { children: ReactNode; sub?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
        {sub && <p className="mt-1 text-sm text-suave">{sub}</p>}
      </div>
      {acao}
    </div>
  )
}

export const brl = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const pct = (n: number) => `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
export const dataHora = (d: string | Date) => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
export const fmtCnpj = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2 font-bold tracking-tight', className)}>
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="4" y="2" width="22" height="28" rx="4" fill="#14805e" />
        <path d="M9 10h12M9 15h12M9 20h7" stroke="#d7f3e8" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="25" cy="24" r="6" fill="#f59e0b" />
        <path d="M22.5 24l1.8 1.8 3.2-3.4" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      NotaLeve
    </span>
  )
}
