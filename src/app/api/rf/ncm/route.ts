import { NextResponse } from 'next/server'
import { buscarNcm } from '@/lib/receita/client'
import { supabaseServidor } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { data } = await (await supabaseServidor()).auth.getUser()
  if (!data.user) return NextResponse.json({ erro: 'não autenticado' }, { status: 401 })
  const ncm = (new URL(req.url).searchParams.get('ncm') ?? '').replace(/\D/g, '')
  if (ncm.length !== 8) return NextResponse.json({ erro: 'NCM deve ter 8 dígitos' }, { status: 400 })
  const info = await buscarNcm(ncm, new Date().toISOString().slice(0, 10))
  if (!info) return NextResponse.json({ erro: 'NCM não encontrada na tabela oficial' }, { status: 404 })
  return NextResponse.json(info)
}
