"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { Button, Card, Modal, PageHeader } from "@/components/ui";
import { logout } from "@/components/AuthGate";

const LINKS = [
  { href: "/phases", label: "Phases", icon: "🗓", desc: "Manage training phases & unlocks" },
  { href: "/metrics", label: "Body metrics", icon: "⚖️", desc: "Log weight, muscle, body fat" },
  { href: "/checkin", label: "Weekly check-in", icon: "✅", desc: "Wall sit & weekly notes" },
];

export default function MorePage() {
  const store = useStore();
  const [confirmReset, setConfirmReset] = useState(false);

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

      <Card className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Data</p>
        <p className="text-xs text-muted">
          All data lives in this browser&apos;s local storage. Resetting restores the
          seeded phases and clears every logged session, metric and check-in.
        </p>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          Reset all data
        </Button>
      </Card>

      <Card className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Account</p>
        <Button
          variant="secondary"
          onClick={() => {
            logout();
            window.location.reload();
          }}
        >
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
