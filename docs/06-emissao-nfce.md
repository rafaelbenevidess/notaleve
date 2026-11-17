# 06 – Emissão de NFC-e direto na SEFAZ

## Decisão

Emitir **sem intermediário** (Focus NFe, Nuvem Fiscal, PlugNotas etc.), integrando direto com o webservice da SEFAZ da UF, ou da SVRS quando o estado não tem SEFAZ própria. Começamos por **uma UF piloto** em homologação. Ver [ADR-0005](adr/0005-emissao-direta-sefaz.md).

### Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Emissor Nacional NFS-e (nfse.gov.br) | Só emite **NFS-e (serviços)**. Loja de mercadoria emite NFC-e/NF-e |
| Emissor Web do Sebrae | Gratuito, mas manual, sem API pública conhecida; fontes divergem sobre suporte a NFC-e |
| Emissor gratuito de SEFAZ | Não existe para NFC-e (os emissores gratuitos de NF-e foram descontinuados) |
| Intermediário pago | Custo por CNPJ ou por nota; perde o diferencial de custo zero. Fica como plano B |

## Fonte oficial

**Portal Nacional da NF-e:** <https://www.nfe.fazenda.gov.br/portal/principal.aspx>
- Notas Técnicas: **NT 2025.002** (grupo IBS/CBS/IS) e **NT 2026.005** (Simples Nacional / `tpRegimeIBSCBS`, citada pela calculadora do SN).
- Schemas XSD do pacote vigente → versionar em `lib/fiscal/schemas/<versao>/`.
- Relação de webservices por UF (autorização, retorno, eventos, inutilização, consulta, URL do QR Code).
- Consulta pública de chave.

O repositório da Receita também traz XSDs em `vendor/calculadora-rtc-regime-regular/src/main/resources/xml/nfce`, úteis para validar o grupo IBSCBS.

## Pré-requisitos por lojista
1. **Certificado A1** (e-CNPJ, ICP-Brasil) da empresa.
2. **Inscrição estadual** ativa e habilitada como emissor de NFC-e na SEFAZ da UF.
3. **CSC + ID do token**, gerados no portal da SEFAZ (um par para homologação e outro para produção).

## Pré-requisitos do NotaLeve (responsável técnico)
- CNPJ da empresa que opera o NotaLeve, preenchido no grupo **infRespTec** de toda nota.
- Nas UFs que exigem: cadastro do responsável técnico e uso do **CSRT** (hash).

## Fluxo de emissão

```
venda (modo hoje) → montarXml() → validar XSD → assinar (xmldsig, A1)
  → Autorizador[UF].autorizar() [SOAP 1.2, mTLS com A1, síncrono]
  → cStat 100 → anexar protocolo (nfeProc) → gerar QR Code + DANFE → gravar
  → cStat ≠ 100 → nota_eventos(c_stat, x_motivo) → mensagem amigável
```

## Interface `Autorizador`

Contrato obrigatório desde o MVP, para que adicionar um estado seja só configuração + testes:

```ts
interface Autorizador {
  uf: string                         // 'SP', 'RS', ... ou 'SVRS'
  ambiente: 'homologacao' | 'producao'
  urls: { autorizacao: string; retAutorizacao?: string; evento: string; inutilizacao: string;
          consulta: string; statusServico: string; qrCode: string; consultaChave: string }
  versaoServico: string
  autorizar(xmlAssinado: string, cert: CertificadoA1): Promise<RetornoAutorizacao>
  cancelar(...): Promise<RetornoEvento>
  inutilizar(...): Promise<RetornoInutilizacao>
  status(): Promise<StatusServico>
}
```

## Biblioteca

Na fase 4, avaliar libs open source TypeScript/Node de NF-e/NFC-e (montagem, assinatura, comunicação) contra um módulo próprio enxuto. Critérios:
1. suporte à NT 2025.002 / 2026.005;
2. funcionar em serverless (sem binários nativos);
3. licença compatível com uso comercial;
4. manutenção ativa.

A decisão vira um ADR.

## Roadmap: "ponte" nacional (fase 6)

- Não existe credenciamento de intermediário: o emitente é sempre o lojista com o A1 dele. Nós somos o responsável técnico do software.
- Cobrir as UFs significa cerca de 12 autorizadores distintos (SEFAZ próprias + SVRS/SVAN), cada um com adaptador, testes em homologação, CSRT quando exigido e tratamento de rejeições locais.
- Depois disso: contingência (tpEmis 9 / EPEC), fila de reenvio, monitor de status das SEFAZ e **API pública** para outros softwares (segunda linha de receita).

## Ambiente de teste
- **Desenvolvimento:** `infra/sefaz-mock` (a criar) responde autorização, eventos e inutilização com XMLs de retorno válidos.
- **Validação:** homologação real da UF piloto. Exige certificado A1 + CSC de homologação e a liberação do host na rede.
