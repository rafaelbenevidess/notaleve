// Assinatura XMLDSig no padrão da NF-e (RSA-SHA1, C14N, enveloped).
import { SignedXml } from 'xml-crypto'
import type { CertificadoA1 } from './certificado'

const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature'

/**
 * Assina o elemento `elemento` (ex.: infNFe, infEvento, infInut) e insere <Signature>
 * como último filho de `pai` (ex.: NFe, evento, inutNFe).
 */
export function assinarXml(xml: string, cert: CertificadoA1, elemento: string, pai: string): string {
  const sig = new SignedXml({
    privateKey: cert.chavePrivadaPem,
    publicCert: cert.certificadoPem,
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    canonicalizationAlgorithm: C14N,
  })
  sig.addReference({
    xpath: `//*[local-name(.)='${elemento}']`,
    transforms: [ENVELOPED, C14N],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
  })
  sig.getKeyInfoContent = () => `<X509Data><X509Certificate>${cert.certificadoBase64}</X509Certificate></X509Data>`
  sig.computeSignature(xml, { location: { reference: `//*[local-name(.)='${pai}']`, action: 'append' } })
  return sig.getSignedXml()
}

/** Verifica a assinatura usando o certificado embutido em <X509Certificate>. */
export function verificarAssinatura(xmlAssinado: string): boolean {
  const m = xmlAssinado.match(/<X509Certificate>([^<]+)<\/X509Certificate>/)
  const sigXml = xmlAssinado.match(/<Signature[\s\S]*?<\/Signature>/)
  if (!m || !sigXml) return false
  const pem = `-----BEGIN CERTIFICATE-----\n${m[1].match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----\n`
  const v = new SignedXml({ publicCert: pem })
  v.loadSignature(sigXml[0])
  try { return v.checkSignature(xmlAssinado) } catch { return false }
}
