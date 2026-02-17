"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function CreateHivePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [mode, setMode] = useState<"live" | "reveal">("live");
  const [revealAt, setRevealAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const payload = {
      title: title.trim(),
      recipient_name: recipientName.trim(),
      mode,
      reveal_at: mode === "reveal" ? new Date(revealAt).toISOString() : null,
      closes_at: new Date(closesAt).toISOString(),
    };

    const { data, error: insertError } = await supabase
      .from("hives")
      .insert(payload)
      .select("id")
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/hive/${data.id}`);
  }

  return (
    <main className="min-h-screen p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-semibold">Create a Hive</h1>
      <p className="mt-2 text-gray-600">
        This is the moderator flow. You’ll share the link after creation.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium">Hive title</label>
          <input
            className="mt-1 w-full rounded-lg border p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Promotion Hive for Sgt. Smith"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Recipient name</label>
          <input
            className="mt-1 w-full rounded-lg border p-2"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="e.g., Sgt. Smith"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Mode</label>
          <select
            className="mt-1 w-full rounded-lg border p-2"
            value={mode}
            onChange={(e) => setMode(e.target.value as "live" | "reveal")}
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
          <label className="block text-sm font-medium">Closure (Harvest) date/time</label>
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
