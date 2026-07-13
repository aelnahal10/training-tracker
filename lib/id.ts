// Small unique-id generator. Uses crypto.randomUUID when available,
// otherwise falls back to a timestamp + random string.
export function uid(prefix = ""): string {
  const c =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${c}` : c;
}
