import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || "riroartdsg@gmail.com")
  .trim()
  .toLowerCase();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isAdminUser(session) {
  return Boolean(session?.user?.email?.toLowerCase() === adminEmail);
}
