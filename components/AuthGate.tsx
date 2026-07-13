"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, inputClass } from "@/components/ui";

// ⚠️ SECURITY NOTE
// This is a fully static, backend-less app (GitHub Pages). This gate is only a
// casual deterrent — it keeps the app out of view on a shared device. It is NOT
// real security: a determined person can read the bundle or edit localStorage to
// bypass it. Never store anything genuinely sensitive here.
//
// We compare a SHA-256 hash so the plaintext password isn't in the source, but
// the hash of a known/weak password is still crackable. Username: admin.
const USERNAME = "admin";
const PASSWORD_SHA256 =
  "3323bd14d861d4f73470cf87c8da9343fff88355223fd001b790a30163dd33f1";
const AUTH_KEY = "training-tracker:authed";

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function logout() {
  if (typeof window !== "undefined") window.localStorage.removeItem(AUTH_KEY);
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setAuthed(window.localStorage.getItem(AUTH_KEY) === "yes");
    setReady(true);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError("");
    const hash = await sha256Hex(password);
    if (username.trim().toLowerCase() === USERNAME && hash === PASSWORD_SHA256) {
      window.localStorage.setItem(AUTH_KEY, "yes");
      setAuthed(true);
    } else {
      setError("Incorrect username or password.");
      setPassword("");
    }
    setChecking(false);
  };

  // Avoid a flash of the login screen before we've read localStorage.
  if (!ready) return null;

  if (authed) return <>{children}</>;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">Training Tracker</h1>
        <p className="text-sm text-muted">Sign in to continue</p>
      </div>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Username">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              className={inputClass}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputClass}
            />
          </Field>
          {error && <p className="text-sm font-medium text-missed">{error}</p>}
          <Button type="submit" className="w-full" disabled={checking}>
            {checking ? "Checking…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
