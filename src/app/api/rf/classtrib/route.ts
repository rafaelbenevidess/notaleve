import { NextResponse } from 'next/server'
import { listarClassTrib, ncmAplicavel } from '@/lib/receita/client'
import { supabaseServidor } from '@/lib/supabase/server'

// GET ?ncm=XXXXXXXX&cClassTrib=YYYYYY → valida o par; sem cClassTrib → lista resumida
export async function GET(req: Request) {
  const { data } = await (await supabaseServidor()).auth.getUser()
  if (!data.user) return NextResponse.json({ erro: 'não autenticado' }, { status: 401 })
  const q = new URL(req.url).searchParams
  const hoje = new Date().toISOString().slice(0, 10)
  const ncm = q.get('ncm'), ct = q.get('cClassTrib')
  if (ncm && ct) return NextResponse.json({ valido: await ncmAplicavel(ncm, ct, hoje) })
  const lista = await listarClassTrib(hoje)
  return NextResponse.json(lista.map((c) => ({ codigo: c.codigo, descricao: c.descricao, tratamento: c.descricaoTratamentoTributario, reducaoCbs: c.percentualReducaoCbs ?? 0, reducaoIbs: c.percentualReducaoIbsUf ?? 0 })))
}
