// Card "Hoje × Reforma 2033" (RF-23). Sem hooks: serve em Server e Client Components.
import type { ComparativoVenda, ResultadoCalculo } from '@/lib/tributos/tipos'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (n: number) => `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

function Linhas({ r }: { r: ResultadoCalculo }) {
  const t = r.totais
  const linhas: Array<[string, number]> = [
    ['CBS', t.cbs], ['IBS estadual', t.ibsUf], ['IBS municipal', t.ibsMun], ['Imposto Seletivo', t.is],
    ['ICMS', t.icms], ['PIS/COFINS', t.pisCofins], ['IRPJ/CSLL/CPP (DAS)', t.outros],
  ]
  return (
    <dl className="mt-3 space-y-1 text-sm">
      {linhas.filter(([, v]) => v > 0).map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2"><dt className="text-suave">{k}</dt><dd className="num">{brl(v)}</dd></div>
      ))}
    </dl>
  )
}

export function Comparativo({ c }: { c: ComparativoVenda }) {
  const sobe = c.diferenca > 0.004
  const desce = c.diferenca < -0.004
  const erros = c.reforma.itens.filter((i) => i.estado === 'erro')
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-xl border border-linha bg-white p-4" aria-label="Tributos hoje">
          <p className="text-xs font-semibold uppercase tracking-wide text-suave">Hoje · vai na nota</p>
          <p className="num mt-1 text-2xl font-bold">{brl(c.hoje.totais.tributos)}</p>
          <p className="text-sm text-suave">carga efetiva {pct(c.hoje.totais.cargaEfetivaPct)}</p>
          <Linhas r={c.hoje} />
          {c.hoje.totais.cbs > 0 && c.hoje.totais.icms > 0 && <p className="mt-2 text-xs text-suave">CBS/IBS de teste 2026 destacados, mas compensáveis (não somam).</p>}
        </section>
        <section className="rounded-xl border border-marca-100 bg-marca-50 p-4" aria-label="Tributos na reforma completa">
          <p className="text-xs font-semibold uppercase tracking-wide text-marca-700">Reforma completa · 2033 (simulação)</p>
          <p className="num mt-1 text-2xl font-bold text-marca-900">{brl(c.reforma.totais.tributos)}</p>
          <p className="text-sm text-marca-700">carga efetiva {pct(c.reforma.totais.cargaEfetivaPct)}</p>
          <Linhas r={c.reforma} />
        </section>
      </div>
      <p className={`rounded-lg px-3 py-2 text-sm font-medium ${sobe ? 'bg-amber-50 text-alerta' : desce ? 'bg-marca-50 text-marca-700' : 'bg-fundo text-suave'}`}>
        {sobe ? `Na reforma completa esta venda pagaria ${brl(c.diferenca)} a mais (+${pct(c.diferencaPct)} de carga).`
          : desce ? `Na reforma completa esta venda pagaria ${brl(-c.diferenca)} a menos (${pct(c.diferencaPct)} de carga).`
          : 'Carga tributária praticamente igual nos dois cenários.'}
      </p>
      {erros.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-erro">
          {erros.map((i) => <p key={i.numero}>Item {i.numero}: {i.erros?.map((e) => `${e.codigo} — ${e.mensagem}`).join('; ')}</p>)}
        </div>
      )}
      <details className="text-xs text-suave">
        <summary className="cursor-pointer font-medium">Premissas e memória de cálculo</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {[...c.hoje.premissas.map((p) => `Hoje: ${p}`), ...c.reforma.premissas.map((p) => `2033: ${p}`)].map((p) => <li key={p}>{p}</li>)}
        </ul>
        <ul className="mt-2 space-y-1">
          {c.reforma.itens.filter((i) => i.memoria).map((i) => <li key={i.numero}>Item {i.numero} (2033): {i.memoria}</li>)}
        </ul>
        <p className="mt-2">Motores: {c.hoje.motor} · {c.reforma.motor}</p>
      </details>
    </div>
  )
}
