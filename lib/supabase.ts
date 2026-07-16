import { createClient } from "@supabase/supabase-js";

// Public Supabase client config. These two values are safe to commit and to
// ship in the browser bundle — the publishable key is designed to be public and
// access is gated by Supabase Auth + Row Level Security, not by hiding it.
//
// The committed values below are the project defaults so the deployed site works
// without any CI configuration. Set NEXT_PUBLIC_SUPABASE_URL /
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (or repo Variables) to
// point a fork at a different project.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uinwpatwxrebixgrdwdz.supabase.co";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_1x8sNF4qN-MtVC142KXx1g_184-BSdM";

// supabase-js persists the session in localStorage and refreshes it
// automatically, which is exactly what a static single-page app needs.
export const supabase = createClient(url, key);
