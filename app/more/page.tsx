"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { useAuth } from "@/components/AuthProvider";
import { Button, Card, Modal, PageHeader } from "@/components/ui";

const LINKS = [
  { href: "/phases", label: "Phases", icon: "🗓", desc: "Manage training phases & unlocks" },
  { href: "/metrics", label: "Body metrics", icon: "⚖️", desc: "Log weight, muscle, body fat" },
  { href: "/checkin", label: "Weekly check-in", icon: "✅", desc: "Wall sit & weekly notes" },
];

export default function MorePage() {
  const store = useStore();
  const { user, signOut } = useAuth();
  const [confirmReset, setConfirmReset] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const runImport = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await store.importLocal();
      if (!res.imported) {
        setImportMsg("No local data found to import.");
      } else {
        const c = res.counts!;
        setImportMsg(
          `Imported ${c.sessions} sessions, ${c.metrics} metrics, ${c.checkins} check-ins, ${c.phases} phases.`
        );
      }
    } catch {
      setImportMsg("Import failed — check your connection and try again.");
    }
    setImporting(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="More" />

      <div className="space-y-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="flex items-center gap-3">
              <span className="text-2xl">{l.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-white">{l.label}</p>
                <p className="text-xs text-muted">{l.desc}</p>
              </div>
              <span className="text-muted">›</span>
            </Card>
          </Link>
        ))}
      </div>

      {store.hasLocalData && (
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Import
          </p>
          <p className="text-xs text-muted">
            This browser has data saved from before syncing was enabled. Import it into
            your account to keep it and see it on any device.
          </p>
          <Button variant="secondary" onClick={runImport} disabled={importing}>
            {importing ? "Importing…" : "Import my existing data"}
          </Button>
          {importMsg && <p className="text-xs font-medium text-trained">{importMsg}</p>}
        </Card>
      )}

      <Card className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Data</p>
        <p className="text-xs text-muted">
          Your data syncs to your account. Resetting restores the seeded phases and clears
          every logged session, metric and check-in — on all your devices.
        </p>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          Reset all data
        </Button>
      </Card>

      <Card className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Account</p>
        <p className="text-xs text-muted">Signed in as {user.email}</p>
        <Button variant="secondary" onClick={() => signOut()}>
          Sign out
        </Button>
      </Card>

      {confirmReset && (
        <Modal
          title="Reset everything?"
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  store.reseed();
                  setConfirmReset(false);
                }}
              >
                Reset
              </Button>
            </>
          }
        >
          This permanently deletes all logged data and cannot be undone.
        </Modal>
      )}
    </div>
  );
}
