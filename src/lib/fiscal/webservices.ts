// Autorizadores de NFC-e por UF (ADR-0008). Adicionar uma UF = nova entrada + testes em homologação.
// URLs devem ser conferidas na relação oficial do Portal Nacional da NF-e (pendência P-02).

export interface UrlsAutorizador {
  autorizacao: string
  evento: string
  inutilizacao: string
  statusServico: string
  /** base do QR Code (consulta via QR) */
  qrCode: string
  /** URL de consulta por chave impressa no DANFE */
  consultaChave: string
}

export interface ConfigAutorizador {
  nome: string
  ufs: string[]
  homologacao: UrlsAutorizador
  producao?: UrlsAutorizador
  /** confirmado contra o Portal Nacional? */
  conferido: boolean
}

export const AUTORIZADORES: ConfigAutorizador[] = [
  {
    nome: 'SEFAZ-SP',
    ufs: ['SP'],
    conferido: false,
    homologacao: {
      autorizacao: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx',
      evento: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx',
      inutilizacao: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeInutilizacao4.asmx',
      statusServico: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
      qrCode: 'https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode',
      consultaChave: 'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta',
    },
  },
  {
    nome: 'SVRS',
    ufs: ['AC', 'AL', 'AP', 'BA', 'DF', 'ES', 'PA', 'PB', 'PI', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'TO'],
    conferido: false,
    homologacao: {
      autorizacao: 'https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      evento: 'https://nfce-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
      inutilizacao: 'https://nfce-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx',
      statusServico: 'https://nfce-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
      qrCode: 'https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx',
      consultaChave: 'www.sefaz.rs.gov.br/nfce/consulta',
    },
  },
]

/** Endpoints do mock local (infra/sefaz-mock) — mesmo contrato SOAP. */
export function urlsMock(base: string): UrlsAutorizador {
  return {
    autorizacao: `${base}/ws/NFeAutorizacao4`,
    evento: `${base}/ws/NFeRecepcaoEvento4`,
    inutilizacao: `${base}/ws/NFeInutilizacao4`,
    statusServico: `${base}/ws/NFeStatusServico4`,
    qrCode: `${base}/qrcode`,
    consultaChave: `${base}/consulta`,
  }
}

export function resolverUrls(uf: string, ambiente: 'homologacao' | 'producao'): { nome: string; urls: UrlsAutorizador } {
  if ((process.env.SEFAZ_MODO ?? 'mock') === 'mock') {
    return { nome: 'SEFAZ-MOCK', urls: urlsMock(process.env.SEFAZ_MOCK_URL ?? 'http://localhost:8090') }
  }
  const a = AUTORIZADORES.find((x) => x.ufs.includes(uf.toUpperCase()))
  if (!a) throw new Error(`UF ${uf} ainda não suportada para emissão de NFC-e.`)
  const urls = ambiente === 'producao' ? a.producao : a.homologacao
  if (!urls) throw new Error(`Ambiente de produção ainda não configurado para ${a.nome}.`)
  return { nome: a.nome, urls }
}
