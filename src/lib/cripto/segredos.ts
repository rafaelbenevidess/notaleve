// Cifra de segredos (certificado A1, senha, CSC) com AES-256-GCM (RNF-02).
// Formato: base64( iv[12] | tag[16] | ciphertext ). Chave mestra só em env var.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function chaveMestra(): Buffer {
  const b64 = process.env.NOTALEVE_MASTER_KEY
  if (!b64) throw new Error('NOTALEVE_MASTER_KEY não configurada (gere com: openssl rand -base64 32)')
  const k = Buffer.from(b64, 'base64')
  if (k.length !== 32) throw new Error('NOTALEVE_MASTER_KEY deve ter 32 bytes em base64')
  return k
}

export function cifrar(dado: Buffer | string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', chaveMestra(), iv)
  const ct = Buffer.concat([c.update(typeof dado === 'string' ? Buffer.from(dado, 'utf8') : dado), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64')
}

export function decifrar(b64: string): Buffer {
  const raw = Buffer.from(b64, 'base64')
  const d = createDecipheriv('aes-256-gcm', chaveMestra(), raw.subarray(0, 12))
  d.setAuthTag(raw.subarray(12, 28))
  return Buffer.concat([d.update(raw.subarray(28)), d.final()])
}

export const decifrarTexto = (b64: string) => decifrar(b64).toString('utf8')
