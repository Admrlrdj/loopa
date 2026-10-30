import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Login aktif hanya bila URL dan anon key Supabase diisi; tanpa itu aplikasi berjalan dalam mode tamu. */
export const authEnabled = Boolean(url && anon);

export const supabase: SupabaseClient | null = authEnabled
  ? createClient(url as string, anon as string, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
