import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server client — instantiated fresh per API request, never in browser bundles
export function createServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key)
}

// Browser client — lazy, for client-side use (e.g. realtime subscriptions later)
let _client: SupabaseClient | null = null
export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    _client = createClient(url, key)
  }
  return _client
}
