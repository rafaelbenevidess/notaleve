// Webhook do Asaas: valida o token configurado no painel (header asaas-access-token).
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { EventoAsaas, processarEventoAsaas } from '@/lib/asaas'

function tokenValido(recebido: string | null) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN ?? ''
  if (!recebido || !esperado || recebido.length !== esperado.length) return false
  return timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado))
}

export async function POST(req: Request) {
  if (!tokenValido(req.headers.get('asaas-access-token'))) return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  const ev = (await req.json().catch(() => null)) as EventoAsaas | null
  if (!ev?.event) return NextResponse.json({ erro: 'evento inválido' }, { status: 400 })
  const r = await processarEventoAsaas(ev)
  return NextResponse.json({ recebido: true, ...r })
}
