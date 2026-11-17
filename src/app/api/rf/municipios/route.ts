import { NextResponse } from 'next/server'
import { municipios } from '@/lib/receita/client'

export async function GET(req: Request) {
  const uf = new URL(req.url).searchParams.get('uf') ?? ''
  if (!/^[A-Z]{2}$/.test(uf)) return NextResponse.json([], { status: 400 })
  return NextResponse.json(await municipios(uf))
}
