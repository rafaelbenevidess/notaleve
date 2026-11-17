import { gerarDanfeNfce } from '@/lib/fiscal/nfce/danfe'
import { dadosDanfe } from '@/lib/fiscal/nfce/danfe-dados'
import { supabaseServidor } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await supabaseServidor() // RLS garante que só a empresa dona acessa
  const { data: u } = await sb.auth.getUser()
  if (!u.user) return new Response('não autenticado', { status: 401 })
  const r = await dadosDanfe(sb, id)
  if (!r) return new Response('nota não encontrada', { status: 404 })
  const pdf = await gerarDanfeNfce(r.dados)
  return new Response(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="nfce-${r.numero}.pdf"` } })
}
