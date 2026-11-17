// Cliente com service_role — SOMENTE no servidor (emissão, webhook, segredos). Ignora RLS.
import 'server-only'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let cache: SupabaseClient<Database> | null = null
export function supabaseAdmin() {
  if (!cache) {
    cache = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cache
}
