import type { Metadata } from 'next'
import { atualizarEmpresa, salvarCertificado, salvarCsc } from '@/app/acoes/empresa'
import { FormAcao } from '@/components/form-acao'
import { Aviso, Campo, Cartao, Entrada, fmtCnpj, Selecao, Selo, Titulo } from '@/components/ui'
import { contexto } from '@/lib/sessao'
import { diasAte } from '@/lib/util/datas'

export const metadata: Metadata = { title: 'Configurações' }

export default async function Configuracoes({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const { sb, empresa: e } = await contexto()
  const { bemvindo } = await searchParams
  const { data: cert } = await sb.from('certificados').select('cn, cnpj, valido_ate, fingerprint_sha256').eq('empresa_id', e.id).eq('ativo', true).maybeSingle()
  const diasCert = cert ? diasAte(cert.valido_ate) : null
  return (
    <>
      <Titulo sub={`${fmtCnpj(e.cnpj)} · ${e.municipio_nome}/${e.uf}`}>Configurações</Titulo>
      {bemvindo && <div className="mb-4"><Aviso tom="ok">Loja criada! Para emitir NFC-e, envie o certificado digital A1 e informe o CSC abaixo. Você já pode cadastrar produtos e registrar vendas.</Aviso></div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Certificado digital A1" acao={cert ? <Selo tom={diasCert! > 30 ? 'ok' : 'alerta'}>{diasCert! > 0 ? `vence em ${diasCert} dias` : 'vencido'}</Selo> : <Selo tom="alerta">não enviado</Selo>}>
          {cert && <p className="mb-3 text-sm text-suave">{cert.cn}<br />Válido até {new Date(cert.valido_ate).toLocaleDateString('pt-BR')}</p>}
          <FormAcao acao={salvarCertificado} botao={cert ? 'Substituir certificado' : 'Enviar certificado'}>
            <Campo rotulo="Arquivo .pfx ou .p12"><Entrada type="file" name="pfx" accept=".pfx,.p12" required /></Campo>
            <Campo rotulo="Senha do certificado" dica="Guardado cifrado (AES-256). Só é usado para assinar suas notas."><Entrada type="password" name="senha" autoComplete="off" required /></Campo>
          </FormAcao>
        </Cartao>
        <Cartao titulo="CSC da NFC-e (QR Code)" acao={e.csc_id ? <Selo tom="ok">configurado</Selo> : <Selo tom="alerta">pendente</Selo>}>
          <p className="mb-3 text-sm text-suave">Gere o Código de Segurança do Contribuinte no portal da SEFAZ de {e.uf} ({e.ambiente === 'homologacao' ? 'ambiente de homologação' : 'produção'}).</p>
          <FormAcao acao={salvarCsc} botao="Salvar CSC">
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo rotulo="ID do token"><Entrada name="csc_id" inputMode="numeric" defaultValue={e.csc_id ?? ''} required /></Campo>
              <div className="sm:col-span-2"><Campo rotulo="CSC"><Entrada name="csc" type="password" autoComplete="off" required placeholder={e.csc_id ? '••••••••' : ''} /></Campo></div>
            </div>
          </FormAcao>
        </Cartao>
        <Cartao titulo="Dados da empresa" className="lg:col-span-2">
          <FormAcao acao={atualizarEmpresa} botao="Salvar dados" className="grid gap-4 sm:grid-cols-2 [&>button]:justify-self-start">
            <Campo rotulo="Razão social"><Entrada name="razao_social" defaultValue={e.razao_social} /></Campo>
            <Campo rotulo="Nome fantasia"><Entrada name="nome_fantasia" defaultValue={e.nome_fantasia ?? ''} /></Campo>
            <Campo rotulo="Inscrição estadual"><Entrada name="ie" defaultValue={e.ie} /></Campo>
            <Campo rotulo="Regime tributário">
              <Selecao name="crt" defaultValue={String(e.crt)}>
                <option value="1">Simples Nacional</option><option value="2">Simples — excesso de sublimite</option>
                <option value="3">Regime normal</option><option value="4">MEI</option>
              </Selecao>
            </Campo>
            <Campo rotulo="Faturamento 12 meses (RBT12)" dica="Usado na alíquota efetiva do Simples."><Entrada name="rbt12" inputMode="decimal" defaultValue={e.rbt12 ?? ''} /></Campo>
            <Campo rotulo="Atividade no Simples"><Selecao name="c_ativ_sn" defaultValue={e.c_ativ_sn ?? '01'}><option value="01">01 — Revenda de mercadorias</option></Selecao></Campo>
            <Campo rotulo="Endereço"><Entrada name="logradouro" defaultValue={e.logradouro} /></Campo>
            <Campo rotulo="Número"><Entrada name="numero" defaultValue={e.numero} /></Campo>
            <Campo rotulo="Bairro"><Entrada name="bairro" defaultValue={e.bairro} /></Campo>
            <Campo rotulo="CEP"><Entrada name="cep" defaultValue={e.cep} /></Campo>
            <Campo rotulo="Série da NFC-e"><Entrada name="nfce_serie" inputMode="numeric" defaultValue={e.nfce_serie} /></Campo>
            <Campo rotulo="Próximo número da NFC-e"><Entrada disabled value={e.nfce_proximo_numero} /></Campo>
          </FormAcao>
        </Cartao>
      </div>
    </>
  )
}
