// Cliente Supabase para Server Components / Server Actions / Route Handlers (sessão do usuário).
import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export async function supabaseServidor() {
  const store = await cookies()
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try { for (const { name, value, options } of lista) store.set(name, value, options) } catch { /* Server Component: somente leitura */ }
      },
    },
  })
}
