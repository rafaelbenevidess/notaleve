// Compara as calculadoras locais (containers) com a instância piloto oficial da Receita.
// Mesmo payload nas duas; ignora campos textuais (memoriaCalculo) e compara os valores.
//   npx tsx scripts/comparar-piloto.mts
import { readFileSync } from 'node:fs'

const LOCAL = process.env.RF_API_URL ?? 'http://localhost:8080/api'
const PILOTO = 'https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api'

// Normaliza: remove textos (memoriaCalculo), o link de documentação do erro (type) e ordena as chaves
const limpar = (o: unknown): unknown =>
  Array.isArray(o) ? o.map(limpar)
  : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'memoriaCalculo' && k !== 'type').sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, limpar(v)]))
  : o

/** Lista os caminhos com valores diferentes */
function diferencas(a: unknown, b: unknown, caminho = '$', saida: string[] = []): string[] {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a as object), ...Object.keys(b as object)]))
      diferencas((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${caminho}.${k}`, saida)
  } else if (JSON.stringify(a) !== JSON.stringify(b)) saida.push(`${caminho}: local=${JSON.stringify(a)} piloto=${JSON.stringify(b)}`)
  return saida
}

async function post(base: string, caminho: string, corpo: unknown) {
  const r = await fetch(`${base}${caminho}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
  return { status: r.status, body: await r.json().catch(() => null) }
}
async function get(base: string, caminho: string) {
  const r = await fetch(`${base}${caminho}`)
  return { status: r.status, body: await r.json().catch(() => null) }
}

const casos: Array<[string, () => Promise<{ status: number; body: unknown }>, () => Promise<{ status: number; body: unknown }>]> = []
const exemplo = JSON.parse(readFileSync('infra/receita/fixtures/operacao-exemplo.json', 'utf8'))
casos.push(['Regime Geral — exemplo oficial (docs/exemplos.md)', () => post(LOCAL, '/calculadora/observabilidade/regime-geral', exemplo), () => post(PILOTO, '/calculadora/observabilidade/regime-geral', exemplo)])
const camiseta = { id: 'cmp', versao: '1.0.0', dhFatoGerador: '2026-11-17T10:00:00-03:00', municipio: 3550308, uf: 'SP', itens: [{ numero: 1, ncm: '61091000', cst: '000', cClassTrib: '000001', baseCalculo: 100, quantidade: 2, unidade: 'UN' }] }
casos.push(['Regime Geral — camiseta em 2026 (alíquotas de referência)', () => post(LOCAL, '/calculadora/regime-geral', camiseta), () => post(PILOTO, '/calculadora/regime-geral', camiseta)])
casos.push(['Dados abertos — NCM 61091000', () => get(LOCAL, '/calculadora/dados-abertos/ncm?ncm=61091000&data=2026-11-17'), () => get(PILOTO, '/calculadora/dados-abertos/ncm?ncm=61091000&data=2026-11-17')])

console.log('Versão da base local :', JSON.stringify((await get(LOCAL, '/calculadora/dados-abertos/versao')).body))
console.log('Versão da base piloto:', JSON.stringify((await get(PILOTO, '/calculadora/dados-abertos/versao')).body))
let falhas = 0
for (const [nome, l, p] of casos) {
  const [a, b] = await Promise.all([l(), p()])
  const igual = a.status === b.status && JSON.stringify(limpar(a.body)) === JSON.stringify(limpar(b.body))
  if (!igual) falhas++
  console.log(`${igual ? 'IGUAL    ' : 'DIFERENTE'} ${nome} (HTTP local ${a.status} / piloto ${b.status})`)
  if (!igual) for (const d of diferencas(limpar(a.body), limpar(b.body)).slice(0, 15)) console.log('   ', d)
}
process.exit(falhas ? 1 : 0)
