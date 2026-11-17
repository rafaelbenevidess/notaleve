// Chave de acesso de 44 dígitos (NF-e/NFC-e) e códigos de UF.

export const CODIGO_UF: Record<string, string> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17', MA: '21', PI: '22', CE: '23', RN: '24',
  PB: '25', PE: '26', AL: '27', SE: '28', BA: '29', MG: '31', ES: '32', RJ: '33', SP: '35', PR: '41', SC: '42',
  RS: '43', MS: '50', MT: '51', GO: '52', DF: '53',
}

export function dvModulo11(base: string): number {
  let soma = 0
  let peso = 2
  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export interface PartesChave {
  uf: string
  emissao: Date
  cnpj: string
  modelo: number
  serie: number
  numero: number
  tpEmis: number
  codigoNumerico: string // 8 dígitos (cNF)
}

export function montarChave(p: PartesChave): { chave: string; cDV: number } {
  const cUF = CODIGO_UF[p.uf.toUpperCase()]
  if (!cUF) throw new Error(`UF inválida: ${p.uf}`)
  const aamm = `${String(p.emissao.getFullYear()).slice(2)}${String(p.emissao.getMonth() + 1).padStart(2, '0')}`
  const base =
    cUF + aamm + p.cnpj.padStart(14, '0') + String(p.modelo).padStart(2, '0') + String(p.serie).padStart(3, '0') +
    String(p.numero).padStart(9, '0') + String(p.tpEmis) + p.codigoNumerico.padStart(8, '0')
  if (base.length !== 43) throw new Error('Chave de acesso com tamanho inválido')
  const cDV = dvModulo11(base)
  return { chave: base + cDV, cDV }
}

export function validarChave(chave: string): boolean {
  return /^\d{44}$/.test(chave) && dvModulo11(chave.slice(0, 43)) === Number(chave[43])
}

/** cNF: 8 dígitos aleatórios, diferente do número da nota */
export function gerarCodigoNumerico(numero: number): string {
  let c: string
  do c = String(Math.floor(Math.random() * 1e8)).padStart(8, '0')
  while (c === String(numero).padStart(8, '0'))
  return c
}
