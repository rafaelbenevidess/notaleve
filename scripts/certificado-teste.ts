// Gera um certificado A1 de TESTE (autoassinado, sem validade jurídica) no formato ICP-Brasil
// "RAZAO SOCIAL:CNPJ". Serve só para a SEFAZ simulada e testes locais.
//   npx tsx scripts/certificado-teste.ts [cnpj] [senha] [saida.pfx]
import forge from 'node-forge'
import { writeFileSync } from 'node:fs'

export function gerarPfxTeste(cnpj = '11222333000181', senha = '1234', razao = 'LOJA EXEMPLO LTDA'): Buffer {
  const chaves = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = chaves.publicKey
  cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(8))
  cert.validity.notBefore = new Date(Date.now() - 86_400_000)
  cert.validity.notAfter = new Date(Date.now() + 365 * 86_400_000)
  const attrs = [
    { name: 'commonName', value: `${razao}:${cnpj}` },
    { name: 'countryName', value: 'BR' },
    { name: 'organizationName', value: 'ICP-Brasil (TESTE NotaLeve)' },
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.setExtensions([{ name: 'keyUsage', digitalSignature: true, keyEncipherment: true }, { name: 'extKeyUsage', clientAuth: true }])
  cert.sign(chaves.privateKey, forge.md.sha256.create())
  const p12 = forge.pkcs12.toPkcs12Asn1(chaves.privateKey, [cert], senha, { algorithm: '3des' })
  return Buffer.from(forge.asn1.toDer(p12).getBytes(), 'binary')
}

if (process.argv[1]?.endsWith('certificado-teste.ts')) {
  const [cnpj = '11222333000181', senha = '1234', saida = 'certificado-teste.pfx'] = process.argv.slice(2)
  writeFileSync(saida, gerarPfxTeste(cnpj, senha))
  console.log(`Certificado de teste gerado: ${saida} (CNPJ ${cnpj}, senha ${senha})`)
}
