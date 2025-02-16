import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Create a single instance that will be reused
let supabase: ReturnType<typeof createSupabaseClient<Database>> | null = null

export const createClient = () => {
  if (supabase) return supabase
  
  supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  return supabase
} 