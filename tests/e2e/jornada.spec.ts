// Jornada completa do lojista no ambiente local.
// Pré-requisitos: npm run receita:up · npx supabase start · npm run sefaz:mock · npm run dev
import { expect, test } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { gerarPfxTeste } from '../../scripts/certificado-teste'

function cnpjAleatorio(): string {
  const b = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('') + '0001'
  const dv = (s: string, pesos: number[]) => { const r = pesos.reduce((a, p, i) => a + Number(s[i]) * p, 0) % 11; return r < 2 ? 0 : 11 - r }
  const d1 = dv(b, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return b + d1 + dv(b + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
}

const SHOTS = process.env.SHOTS_DIR
const foto = async (page: import('@playwright/test').Page, nome: string) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${nome}.png`, fullPage: true }) }

test('lojista do Simples: cadastro → venda → NFC-e autorizada → DANFE → cancelamento → assinatura', async ({ page }) => {
  const cnpj = cnpjAleatorio()
  const email = `loja-${Date.now()}@teste.local`
  const dir = 'test-results'; mkdirSync(dir, { recursive: true })
  const pfx = `${dir}/cert-${cnpj}.pfx`
  writeFileSync(pfx, gerarPfxTeste(cnpj, 'senha-e2e', 'BOUTIQUE AURORA LTDA'))

  // 1) Landing → cadastro
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('2033')
  await foto(page, '01-landing')
  await page.getByRole('link', { name: 'Começar 14 dias grátis' }).click()
  await page.getByLabel('Seu nome').fill('Ana Lojista')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-forte-123')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Criar conta grátis' }).click()

  // 2) Onboarding da loja
  await expect(page).toHaveURL(/onboarding/)
  await page.getByLabel('CNPJ').fill(cnpj)
  await page.getByLabel('Inscrição estadual').fill('111222333444')
  await page.getByLabel('Razão social').fill('Boutique Aurora Ltda')
  await page.getByLabel('Nome fantasia (opcional)').fill('Boutique Aurora')
  await page.getByLabel('UF').selectOption('SP')
  await expect(page.getByLabel('Município')).toContainText('São Paulo')
  await page.getByLabel('Município').selectOption({ label: 'São Paulo' })
  await page.getByLabel('Endereço (rua)').fill('Rua Augusta')
  await page.getByLabel('Número').fill('1500')
  await page.getByLabel('Bairro').fill('Consolação')
  await page.getByLabel('CEP').fill('01304-001')
  await page.getByLabel('Faturamento dos últimos 12 meses (R$)').fill('240.000,00')
  await foto(page, '02-onboarding')
  await page.getByRole('button', { name: /Criar empresa/ }).click()

  // 3) Certificado A1 + CSC
  await expect(page).toHaveURL(/configuracoes/)
  await expect(page.getByText('Loja criada!')).toBeVisible()
  await page.getByLabel('Arquivo .pfx ou .p12').setInputFiles(pfx)
  await page.getByLabel('Senha do certificado').fill('senha-e2e')
  await page.getByRole('button', { name: 'Enviar certificado' }).click()
  await expect(page.getByText(/Certificado de BOUTIQUE AURORA LTDA/)).toBeVisible()
  await page.getByLabel('ID do token').fill('1')
  await page.getByLabel('CSC', { exact: true }).fill('CSC-HOMOLOG-E2E-0001')
  await page.getByRole('button', { name: 'Salvar CSC' }).click()
  await expect(page.getByText('CSC salvo com segurança.')).toBeVisible()
  await foto(page, '03-configuracoes')

  // 4) Produtos (validados na tabela oficial)
  for (const [nome, ncm, preco] of [['Camiseta algodão', '61091000', '59,90'], ['Calça jeans', '62034200', '189,90']]) {
    await page.goto('/produtos/novo')
    await page.getByLabel('Nome do produto').fill(nome)
    await page.getByLabel('NCM').fill(ncm)
    await expect(page.getByText(/compatível com a NCM/)).toBeVisible()
    await page.getByLabel('Preço de venda (R$)').fill(preco)
    await page.getByRole('button', { name: 'Salvar produto' }).click()
    await expect(page).toHaveURL(/\/produtos$/)
  }
  await expect(page.getByRole('cell', { name: 'Calça jeans' })).toBeVisible()
  await foto(page, '04-produtos')

  // 5) PDV: carrinho + comparativo hoje × 2033
  await page.goto('/vender')
  await page.getByRole('button', { name: /Camiseta algodão/ }).click()
  await page.getByRole('button', { name: /Camiseta algodão/ }).click()
  await page.getByRole('button', { name: /Calça jeans/ }).click()
  await expect(page.getByLabel('Carrinho')).toContainText('R$ 309,70')
  await page.getByRole('button', { name: 'Ver impostos: hoje × 2033' }).click()
  await expect(page.getByLabel('Tributos na reforma completa')).toBeVisible()
  await expect(page.getByLabel('Tributos hoje')).toContainText('carga efetiva')
  await foto(page, '05-pdv-comparativo')

  // 6) Finalizar e emitir NFC-e
  await page.getByRole('button', { name: 'Finalizar e emitir NFC-e' }).click()
  await expect(page).toHaveURL(/\/vendas\/[0-9a-f-]+/)
  await expect(page.getByText(/NFC-e nº 1 autorizada/)).toBeVisible()
  await expect(page.getByText(/Protocolo \d{15}/)).toBeVisible()
  await foto(page, '06-venda-autorizada')

  // 7) DANFE em PDF e XML autorizado
  const danfe = await page.getByRole('link', { name: 'DANFE (PDF)' }).getAttribute('href')
  const pdf = await page.request.get(danfe!)
  expect(pdf.headers()['content-type']).toBe('application/pdf')
  expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF')
  const xml = await page.request.get(danfe!.replace('/danfe', '/xml'))
  const corpoXml = await xml.text()
  expect(corpoXml).toContain('<nfeProc')
  expect(corpoXml).toContain('<cStat>100</cStat>')
  expect(corpoXml).toContain('<CSOSN>102</CSOSN>')
  writeFileSync(`${dir}/danfe-e2e.pdf`, await pdf.body())

  // 8) Cancelamento
  await page.getByText('Cancelar NFC-e').click()
  await page.getByLabel('Justificativa').fill('Cliente desistiu da compra no caixa')
  await page.getByRole('button', { name: 'Confirmar cancelamento' }).click()
  await expect(page.getByText(/NFC-e nº 1 cancelada na SEFAZ/)).toBeVisible()

  // 9) Venda sem nota + listas + painel
  await page.goto('/vender')
  await page.getByRole('button', { name: /Calça jeans/ }).click()
  await page.getByLabel('Forma de pagamento').selectOption('01')
  await page.getByLabel('Valor recebido').fill('200,00')
  await expect(page.getByText('Troco:')).toContainText('R$ 10,10')
  await page.getByRole('button', { name: 'Finalizar sem nota' }).click()
  await expect(page.getByText('Venda registrada.')).toBeVisible()
  await page.goto('/notas')
  await expect(page.getByRole('cell', { name: 'cancelada' })).toBeVisible()
  await foto(page, '07-notas')
  await page.goto('/painel')
  await expect(page.getByText('Faturamento do mês')).toBeVisible()
  await expect(page.getByText('Se fosse 2033')).toBeVisible()
  await foto(page, '08-painel')

  // 10) Assinatura (Asaas simulado)
  await page.goto('/assinatura')
  await page.getByRole('button', { name: 'Ativar assinatura' }).click()
  await expect(page).toHaveURL(/assinatura\/simular/)
  await page.getByRole('button', { name: 'Pagamento confirmado' }).click()
  await expect(page).toHaveURL(/\/assinatura$/)
  await expect(page.getByText('ativa', { exact: true })).toBeVisible()
  await foto(page, '09-assinatura')

  // 11) Exportação para o contador
  const zip = await page.request.get(`/api/notas/exportar?mes=${new Date().toISOString().slice(0, 7)}`)
  expect(zip.headers()['content-type']).toBe('application/zip')
})
