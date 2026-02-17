"use client";

import { useState } from "react";

export default function CreateHivePage() {
  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [mode, setMode] = useState<"live" | "reveal">("live");
  const [revealAt, setRevealAt] = useState("");
  const [closesAt, setClosesAt] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [created, setCreated] = useState<null | {
    hiveId: string;
    contributorLink: string;
    moderatorLink: string;
    recipientLink: string;
  }>(null);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied.");
    } catch {
      alert("Could not copy automatically—please select and copy manually.");
    }
  }

  async function handleCreate() {
    setError(null);

    if (!title.trim() || !recipientName.trim() || !closesAt) {
      setError("Please fill in title, recipient name, and a closure date.");
      return;
    }

    if (mode === "reveal" && !revealAt) {
      setError("Reveal mode requires a reveal date.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/create-hive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        recipientName,
        mode,
        revealAt: mode === "reveal" ? revealAt : undefined,
        closesAt,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Create failed.");
      return;
    }

    setCreated(data);
  }

  if (created) {
    return (
      <main className="min-h-screen p-8 max-w-xl mx-auto">
        <h1 className="text-3xl font-semibold">Hive created</h1>
        <p className="mt-2 text-gray-600">
          Share the contributor link with your community. Keep the moderator/recipient links private.
        </p>

        <div className="mt-6 rounded-2xl border p-6 space-y-5">
          <div>
            <p className="text-sm font-medium">Contributor link (public)</p>
            <p className="mt-1 break-all">{created.contributorLink}</p>
            <button
              className="mt-2 w-full rounded-xl border py-3 font-medium"
              onClick={() => copy(created.contributorLink)}
            >
              Copy contributor link
            </button>
          </div>

          <div>
            <p className="text-sm font-medium">Moderator link (private)</p>
            <p className="mt-1 break-all">{created.moderatorLink}</p>
            <button
              className="mt-2 w-full rounded-xl border py-3 font-medium"
              onClick={() => copy(created.moderatorLink)}
            >
              Copy moderator link
            </button>
          </div>

          <div>
            <p className="text-sm font-medium">Recipient link (private)</p>
            <p className="mt-1 break-all">{created.recipientLink}</p>
            <button
              className="mt-2 w-full rounded-xl border py-3 font-medium"
              onClick={() => copy(created.recipientLink)}
            >
              Copy recipient link
            </button>
          </div>

          <a
            className="block w-full text-center rounded-xl bg-black text-white py-3 font-medium"
            href={created.moderatorLink}
          >
            Open hive as moderator
          </a>
        </div>

        <button
          className="mt-6 w-full rounded-xl border py-3 font-medium"
          onClick={() => setCreated(null)}
        >
          Create another hive
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-semibold">Create a Hive</h1>

      <div className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium">Hive title</label>
          <input
            className="mt-1 w-full rounded-lg border p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Recipient name</label>
          <input
            className="mt-1 w-full rounded-lg border p-2"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Mode</label>
          <select
            className="mt-1 w-full rounded-lg border p-2"
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
          >
            <option value="live">Live</option>
            <option value="reveal">Reveal</option>
          </select>
        </div>

        {mode === "reveal" && (
          <div>
            <label className="block text-sm font-medium">Reveal date/time</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg border p-2"
              value={revealAt}
              onChange={(e) => setRevealAt(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">Closure date/time</label>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border p-2"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Hive"}
        </button>
      </div>
    </main>
  );
}
