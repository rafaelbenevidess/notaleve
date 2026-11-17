import { supabaseServidor } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await supabaseServidor()
  const { data: u } = await sb.auth.getUser()
  if (!u.user) return new Response('não autenticado', { status: 401 })
  const { data: n } = await sb.from('notas').select('chave, xml').eq('id', id).maybeSingle()
  if (!n) return new Response('nota não encontrada', { status: 404 })
  return new Response(n.xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Content-Disposition': `attachment; filename="${n.chave}-nfce.xml"` } })
}
