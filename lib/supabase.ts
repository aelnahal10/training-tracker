import { createClient } from "@supabase/supabase-js";

// Public client config — safe to ship in the browser bundle. Access is gated by
// Supabase Auth + Row Level Security, not by hiding these values.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // Clear signal in dev instead of a cryptic failure deep in a request.
  console.warn(
    "Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local"
  );
}

// supabase-js persists the session in localStorage and refreshes it
// automatically, which is exactly what a static single-page app needs.
// Fall back to harmless placeholders when env is missing so a build without the
// vars configured doesn't crash at import (requests just fail at runtime).
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-key"
);
