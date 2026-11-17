'use client'
import { useActionState, useEffect, useState } from 'react'
import { criarEmpresa } from '@/app/acoes/empresa'
import type { EstadoForm } from '@/app/acoes/auth'
import { Aviso, Botao, Campo, Entrada, Selecao } from './ui'

export function FormEmpresa({ ufs }: { ufs: Array<{ sigla: string; nome: string }> }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(criarEmpresa, undefined)
  const [uf, setUf] = useState('SP')
  const [crt, setCrt] = useState('1')
  const [muns, setMuns] = useState<Array<{ codigo: number; nome: string }>>([])
  useEffect(() => {
    let vivo = true
    fetch(`/api/rf/municipios?uf=${uf}`).then((r) => r.json()).then((m) => vivo && setMuns(m)).catch(() => setMuns([]))
    return () => { vivo = false }
  }, [uf])
  const simples = crt !== '3'
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="CNPJ"><Entrada name="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" required /></Campo>
      <Campo rotulo="Inscrição estadual"><Entrada name="ie" required /></Campo>
      <div className="sm:col-span-2"><Campo rotulo="Razão social"><Entrada name="razao_social" required /></Campo></div>
      <div className="sm:col-span-2"><Campo rotulo="Nome fantasia (opcional)"><Entrada name="nome_fantasia" /></Campo></div>
      <Campo rotulo="UF">
        <Selecao name="uf" value={uf} onChange={(e) => setUf(e.target.value)}>
          {ufs.map((u) => <option key={u.sigla} value={u.sigla}>{u.sigla} — {u.nome}</option>)}
        </Selecao>
      </Campo>
      <Campo rotulo="Município" dica="Lista oficial da Receita (código IBGE).">
        <Selecao name="municipio" required defaultValue="">
          <option value="" disabled>{muns.length ? 'Escolha…' : 'Carregando…'}</option>
          {muns.map((m) => <option key={m.codigo} value={`${m.codigo}|${m.nome}`}>{m.nome}</option>)}
        </Selecao>
      </Campo>
      <div className="sm:col-span-2"><Campo rotulo="Endereço (rua)"><Entrada name="logradouro" required /></Campo></div>
      <Campo rotulo="Número"><Entrada name="numero" /></Campo>
      <Campo rotulo="Bairro"><Entrada name="bairro" required /></Campo>
      <Campo rotulo="CEP"><Entrada name="cep" inputMode="numeric" required /></Campo>
      <Campo rotulo="Regime tributário">
        <Selecao name="crt" value={crt} onChange={(e) => setCrt(e.target.value)}>
          <option value="1">Simples Nacional</option>
          <option value="2">Simples Nacional — excesso de sublimite</option>
          <option value="3">Regime normal (Lucro Presumido/Real)</option>
          <option value="4">MEI</option>
        </Selecao>
      </Campo>
      {simples && (
        <>
          <Campo rotulo="Atividade no Simples">
            <Selecao name="c_ativ_sn" defaultValue="01">
              <option value="01">01 — Revenda de mercadorias (Anexo I)</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Faturamento dos últimos 12 meses (R$)" dica="Define a faixa e a alíquota efetiva do Simples. Pode ajustar depois.">
            <Entrada name="rbt12" inputMode="decimal" placeholder="180.000,00" />
          </Campo>
        </>
      )}
      {estado?.erro && <div className="sm:col-span-2"><Aviso tom="erro">{estado.erro}</Aviso></div>}
      <div className="sm:col-span-2"><Botao type="submit" disabled={pendente} className="w-full sm:w-auto">{pendente ? 'Criando…' : 'Criar empresa e começar o teste grátis'}</Botao></div>
    </form>
  )
}
