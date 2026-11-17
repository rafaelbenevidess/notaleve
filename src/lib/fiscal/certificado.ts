// Leitura do certificado A1 (.pfx/.p12) com node-forge.
import { createHash } from 'node:crypto'
import forge from 'node-forge'

export interface CertificadoA1 {
  chavePrivadaPem: string
  certificadoPem: string
  /** certificado em base64 DER, para <X509Certificate> */
  certificadoBase64: string
  cn: string
  cnpj: string | null
  validoDe: Date
  validoAte: Date
  fingerprintSha256: string
}

const OID_CNPJ = '2.16.76.1.3.3' // ICP-Brasil: CNPJ da pessoa jurídica (otherName no SAN)

export function lerPfx(pfx: Buffer, senha: string): CertificadoA1 {
  let p12: forge.pkcs12.Pkcs12Pfx
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfx.toString('binary')))
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, senha)
  } catch {
    throw new Error('Não foi possível abrir o certificado: arquivo inválido ou senha incorreta.')
  }
  const keyBag = (p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [])[0]
    ?? (p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? [])[0]
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? []
  if (!keyBag?.key || certBags.length === 0) throw new Error('Certificado sem chave privada ou sem certificado.')

  const chave = keyBag.key as forge.pki.rsa.PrivateKey
  // escolhe o certificado cuja chave pública corresponde à chave privada (ignora cadeia)
  const cert = certBags.map((b) => b.cert!).find((c) => (c.publicKey as forge.pki.rsa.PublicKey).n.equals(chave.n)) ?? certBags[0].cert!

  const der = Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(), 'binary')
  const cn = String(cert.subject.getField('CN')?.value ?? '')
  return {
    chavePrivadaPem: forge.pki.privateKeyToPem(chave),
    certificadoPem: forge.pki.certificateToPem(cert),
    certificadoBase64: der.toString('base64'),
    cn,
    cnpj: extrairCnpj(cert, cn),
    validoDe: cert.validity.notBefore,
    validoAte: cert.validity.notAfter,
    fingerprintSha256: createHash('sha256').update(der).digest('hex'),
  }
}

function extrairCnpj(cert: forge.pki.Certificate, cn: string): string | null {
  // 1) Padrão ICP-Brasil: "RAZAO SOCIAL:12345678000199" no CN
  const m = cn.match(/:(\d{14})$/)
  if (m) return m[1]
  // 2) otherName 2.16.76.1.3.3 no subjectAltName
  const san = cert.getExtension('subjectAltName') as { altNames?: Array<{ type: number; value: unknown }> } | null
  for (const alt of san?.altNames ?? []) {
    const txt = typeof alt.value === 'string' ? alt.value : ''
    if (txt.includes(OID_CNPJ)) {
      const d = txt.match(/\d{14}/)
      if (d) return d[0]
    }
  }
  return null
}

export function validarCertificado(c: CertificadoA1, cnpjEmpresa: string, agora = new Date()) {
  const erros: string[] = []
  if (c.validoAte < agora) erros.push(`Certificado vencido em ${c.validoAte.toLocaleDateString('pt-BR')}.`)
  if (c.validoDe > agora) erros.push('Certificado ainda não é válido.')
  if (c.cnpj && c.cnpj.slice(0, 8) !== cnpjEmpresa.slice(0, 8)) erros.push(`O certificado é do CNPJ ${c.cnpj}, diferente da empresa (${cnpjEmpresa}).`)
  return erros
}
