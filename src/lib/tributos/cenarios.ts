// Premissas configuráveis dos dois modos. Toda premissa aparece na UI (ver L-02/L-03).

/** Alíquotas nominais estimadas para a reforma completa (regime normal). PREMISSA. */
export const ALIQUOTAS_2033 = { cbs: 8.8, ibsEstadual: 14.6, ibsMunicipal: 3.1 } as const

/** Data usada como fato gerador do cenário "reforma completa". */
export const DATA_2033 = '2033-01-10'

/** Regras do "modo hoje" — versionadas por ano (RNF-06). */
export const REGRAS_HOJE = {
  versao: '2026.1',
  /** Destaque de teste 2026 (LC 214/2025, art. 343): compensável com PIS/COFINS, não é custo adicional */
  teste2026: { cbs: 0.9, ibsUf: 0.1, ibsMun: 0 },
  /** Regime normal — PIS/COFINS cumulativo (lucro presumido). PREMISSA. */
  pisCofinsNormal: 3.65,
  /** Alíquota interna padrão de ICMS por UF (estimativa configurável; validar por produto) */
  icmsInterno: { SP: 18, MG: 18, RJ: 20, PR: 19.5, RS: 17, SC: 17, BA: 20.5, PE: 20.5, CE: 20, GO: 19, DF: 20, ES: 17 } as Record<string, number>,
  icmsPadrao: 18,
} as const

export const icmsInterno = (uf: string) => REGRAS_HOJE.icmsInterno[uf.toUpperCase()] ?? REGRAS_HOJE.icmsPadrao
