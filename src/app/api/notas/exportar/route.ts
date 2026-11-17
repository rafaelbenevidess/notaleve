// Exportação mensal dos XMLs para o contador (RF-41): zip com XMLs + resumo CSV.
import JSZip from 'jszip'
import { contexto } from '@/lib/sessao'

export async function GET(req: Request) {
  const { sb, empresa } = await contexto()
  const mes = new URL(req.url).searchParams.get('mes') ?? new Date().toISOString().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(mes)) return new Response('mes inválido (AAAA-MM)', { status: 400 })
  const ini = new Date(`${mes}-01T00:00:00-03:00`)
  const fim = new Date(ini); fim.setMonth(fim.getMonth() + 1)
  const { data: notas } = await sb.from('notas').select('numero, serie, chave, status, protocolo, emitida_em, xml, vendas(total)')
    .eq('empresa_id', empresa.id).in('status', ['autorizada', 'cancelada']).gte('emitida_em', ini.toISOString()).lt('emitida_em', fim.toISOString()).order('numero')
  const zip = new JSZip()
  const linhas = ['numero;serie;chave;status;protocolo;emitida_em;valor']
  for (const n of notas ?? []) {
    zip.file(`xml/${n.chave}-nfce.xml`, n.xml ?? '')
    linhas.push([n.numero, n.serie, n.chave, n.status, n.protocolo, n.emitida_em, (n.vendas as unknown as { total: number })?.total].join(';'))
  }
  zip.file('resumo.csv', '﻿' + linhas.join('\n'))
  const buf = await zip.generateAsync({ type: 'nodebuffer' })
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="nfce-${empresa.cnpj}-${mes}.zip"` } })
}
