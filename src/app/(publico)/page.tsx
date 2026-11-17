import { BotaoLink } from '@/components/ui'

const passos = [
  { t: 'Cadastre seus produtos', d: 'Busque o NCM e veja na hora como cada produto será tributado na reforma.' },
  { t: 'Registre a venda no balcão', d: 'Carrinho simples, Pix, cartão ou dinheiro. Funciona no celular.' },
  { t: 'Emita a NFC-e', d: 'Direto na SEFAZ com o seu certificado digital, sem custo por nota.' },
]

export default function Inicio() {
  return (
    <>
      <section className="bg-gradient-to-b from-marca-50 to-fundo">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-marca-700 ring-1 ring-marca-100">Reforma Tributária · CBS · IBS · IS</p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">Venda, emita a nota e saiba hoje quanto vai pagar em 2033.</h1>
            <p className="mt-4 text-lg text-suave">O NotaLeve é o caixa do pequeno lojista: registra a venda, emite a NFC-e e mostra, para cada venda, o imposto de hoje lado a lado com a reforma completa.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <BotaoLink href="/cadastro" className="px-6 py-3 text-base">Começar 14 dias grátis</BotaoLink>
              <BotaoLink href="/entrar" variante="secundario" className="px-6 py-3 text-base">Já tenho conta</BotaoLink>
            </div>
            <p className="mt-3 text-sm text-suave">Plano Loja: R$ 59,90/mês, notas ilimitadas. Sem cartão para testar.</p>
          </div>
          <div className="rounded-2xl border border-linha bg-white p-5 shadow-sm" aria-label="Exemplo de comparativo">
            <p className="text-sm font-semibold text-suave">Venda #128 · Camiseta algodão (2 un.)</p>
            <p className="num mt-1 text-3xl font-bold">R$ 100,00</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-fundo p-4">
                <p className="text-xs font-semibold uppercase text-suave">Hoje (na nota)</p>
                <p className="num mt-1 text-2xl font-bold">R$ 4,00</p>
                <p className="text-xs text-suave">DAS · 4,00%</p>
              </div>
              <div className="rounded-xl bg-marca-50 p-4 ring-1 ring-marca-100">
                <p className="text-xs font-semibold uppercase text-marca-700">Reforma (2033)</p>
                <p className="num mt-1 text-2xl font-bold text-marca-900">R$ 4,00</p>
                <p className="text-xs text-marca-700">CBS + IBS + DAS · 4,00%</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-suave">Calculado com a calculadora oficial do Simples Nacional publicada pela Receita Federal.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold">Como funciona</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {passos.map((p, i) => (
            <li key={p.t} className="rounded-xl border border-linha bg-white p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-marca-600 text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{p.t}</h3>
              <p className="mt-1 text-sm text-suave">{p.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
