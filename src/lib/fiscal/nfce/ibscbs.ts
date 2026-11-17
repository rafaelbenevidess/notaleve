// Grupo IBSCBS (NT 2025.002) gerado pela calculadora OFICIAL da Receita:
// POST /calculadora/regime-geral (ano corrente) → POST /calculadora/xml/generate?tipo=nfce
// Devolve o XML de <IBSCBS> por item e o <IBSCBSTot>, prontos para embutir na NFC-e.

const RG = () => process.env.RF_API_URL ?? 'http://localhost:8080/api'

export interface ItemIbsCbs { numero: number; ncm: string; cst: string; cClassTrib: string; base: number; quantidade: number; unidade: string }

export interface GruposIbsCbs { porItem: Map<number, string>; total: string | null; calculo: unknown }

export async function gerarGruposIbsCbs(p: { uf: string; municipioIbge: number; emissao: Date; itens: ItemIbsCbs[] }): Promise<GruposIbsCbs> {
  const dh = new Date(p.emissao.getTime() - 3 * 3600_000).toISOString().slice(0, 19) + '-03:00'
  const req = {
    id: crypto.randomUUID().replace(/-/g, ''), versao: '1.0.0', dhFatoGerador: dh, municipio: p.municipioIbge, uf: p.uf,
    itens: p.itens.map((i) => ({ numero: i.numero, ncm: i.ncm, cst: i.cst, cClassTrib: i.cClassTrib, baseCalculo: Math.round(i.base * 100) / 100, quantidade: i.quantidade, unidade: i.unidade })),
  }
  const calc = await fetch(`${RG()}/calculadora/regime-geral`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req), cache: 'no-store' })
  const calculo = await calc.json()
  if (!calc.ok) {
    const det = (calculo as { errors?: Array<{ code: string; detail: string }> }).errors?.map((e) => `${e.code}: ${e.detail}`).join('; ')
    throw new Error(`A calculadora da Receita recusou os itens (IBS/CBS): ${det ?? calc.status}`)
  }
  const gen = await fetch(`${RG()}/calculadora/xml/generate?tipo=nfce`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(calculo), cache: 'no-store' })
  if (!gen.ok) throw new Error(`Falha ao gerar o grupo IBSCBS na calculadora da Receita (HTTP ${gen.status})`)
  const xml = (await gen.text()).replace(/>\s+</g, '><')
  const porItem = new Map<number, string>()
  for (const m of xml.matchAll(/<det nItem="(\d+)"><imposto>(<IBSCBS>[\s\S]*?<\/IBSCBS>)<\/imposto><\/det>/g)) porItem.set(Number(m[1]), m[2])
  const total = xml.match(/<IBSCBSTot>[\s\S]*?<\/IBSCBSTot>/)?.[0] ?? null
  return { porItem, total, calculo }
}
