import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Termos e privacidade' }

export default function Termos() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold">Termos de uso e política de privacidade</h1>
      <p className="rounded-lg bg-amber-50 p-3 text-alerta">Rascunho para o MVP — deve ser revisado por advogado antes do lançamento (pendência P-06).</p>
      <h2 className="font-semibold">1. Serviço</h2>
      <p>O NotaLeve registra vendas, calcula tributos e transmite NFC-e à SEFAZ em nome do lojista, usando o certificado digital do próprio lojista. O cenário &quot;Reforma 2033&quot; é uma simulação baseada em premissas exibidas na tela e não substitui orientação contábil.</p>
      <h2 className="font-semibold">2. Certificado digital e dados fiscais</h2>
      <p>O certificado A1 e o CSC são armazenados cifrados (AES-256-GCM) e usados apenas para assinar e transmitir documentos fiscais solicitados pelo usuário. Todo uso do certificado é registrado em trilha de auditoria.</p>
      <h2 className="font-semibold">3. LGPD</h2>
      <p>Tratamos dados de cadastro e fiscais para execução do contrato (art. 7º, V, LGPD) e cumprimento de obrigação legal (art. 7º, II). Os XMLs fiscais são guardados pelo prazo legal. O titular pode solicitar acesso, correção e exclusão dos dados não sujeitos a guarda obrigatória.</p>
      <h2 className="font-semibold">4. Assinatura</h2>
      <p>Após o período de teste, a cobrança é mensal via Asaas. Com pagamento em atraso, o acesso fica limitado à consulta até a regularização.</p>
    </article>
  )
}
