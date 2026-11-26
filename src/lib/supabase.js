import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://ateklyzqxbpknezlbgec.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_eidtHeOrNlbCQEKbrjfsdg_i76tUXn8";

const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
).trim();
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY
).trim();
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
