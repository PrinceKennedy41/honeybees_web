"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Hive = {
  id: string;
  title: string;
  recipient_name: string;
  mode: "live" | "reveal";
  reveal_at: string | null;
  closes_at: string;
  created_at: string;

  bee_count?: number;

  thank_you_message?: string | null;
  harvested_at?: string | null;
  harvest_notified_at?: string | null;
};

type MessageRow = {
  id: string;
  hive_id: string;
  contributor_name: string;
  message: string;
  created_at: string;
};

export default function HivePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const hiveId = params.id;
  const token = searchParams.get("token") ?? "";

  const [hive, setHive] = useState<Hive | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingHive, setLoadingHive] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contribution form state
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // After-submit state
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Harvest UI state
  const [thankYou, setThankYou] = useState("");
  const [harvesting, setHarvesting] = useState(false);
  const [harvestResult, setHarvestResult] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);

  const isRevealed = useMemo(() => {
    if (!hive) return false;
    if (hive.mode === "live") return true;
    if (!hive.reveal_at) return false;
    return new Date(hive.reveal_at) <= now;
  }, [hive, now]);

  const isClosed = useMemo(() => {
    if (!hive) return false;
    return new Date(hive.closes_at) <= now;
  }, [hive, now]);

  const contributorShareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/hive/${hiveId}`;
  }, [hiveId]);

  async function loadHive() {
    setError(null);
    setLoadingHive(true);

    const { data, error } = await supabase
      .from("hives")
      .select("id,title,recipient_name,mode,reveal_at,closes_at,created_at,bee_count,thank_you_message,harvested_at,harvest_notified_at")
      .eq("id", hiveId)
      .single();

    setLoadingHive(false);

    if (error) {
      setError(error.message);
      return;
    }

    setHive(data as Hive);
  }

  async function checkAccess() {
    // No token = not authorized (public contributor view)
    if (!token) {
      setAuthorized(false);
      return;
    }

    const res = await fetch("/api/hive-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiveId, token }),
    });

    const data = await res.json();
    setAuthorized(Boolean(data.authorized));
  }

  async function loadMessagesIfAllowed() {
    if (!token) return;
    if (!authorized) return;
    if (!isRevealed) return;

    setLoadingMessages(true);

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiveId, token }),
    });

    const data = await res.json();
    setLoadingMessages(false);

    if (!res.ok) {
      console.log("Messages fetch failed:", data);
      return;
    }

    setMessages((data.messages ?? []) as MessageRow[]);
  }

  useEffect(() => {
    loadHive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiveId]);

  useEffect(() => {
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiveId, token]);

  useEffect(() => {
    loadMessagesIfAllowed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, isRevealed]);

  function startPreview() {
    setSubmitError(null);
    if (!name.trim() || !note.trim()) {
      setSubmitError("Please add your name and a message before continuing.");
      return;
    }
    setIsPreviewing(true);
  }

  async function submitMessage() {
    setSubmitError(null);
    setSubmitting(true);

    const payload = {
      hive_id: hiveId,
      contributor_name: name.trim(),
      message: note.trim(),
    };

    const { error } = await supabase.from("messages").insert(payload);

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setSubmitted(true);
    setIsPreviewing(false);
    setName("");
    setNote("");

    // Update bee_count display by reloading hive
    await loadHive();

    // If authorized + revealed, refresh message list too
    await loadMessagesIfAllowed();
  }

  async function saveEmailForHarvest() {
    setEmailError(null);
    setEmailSaved(false);

    const clean = email.trim();
    if (!clean) {
      setEmailError("Please enter an email address.");
      return;
    }

    setSavingEmail(true);

    const { error } = await supabase.from("harvest_subscribers").insert({
      hive_id: hiveId,
      email: clean,
    });

    setSavingEmail(false);

    if (error) {
      setEmailError(error.message);
      return;
    }

    setEmailSaved(true);
  }

  async function copyContributorLink() {
    try {
      await navigator.clipboard.writeText(contributorShareUrl);
      alert("Contributor link copied.");
    } catch {
      alert("Could not copy automatically. Please select and copy manually.");
    }
  }

  async function harvestAndSend() {
    setHarvestResult(null);

    if (!authorized) {
      setHarvestResult("Only the moderator or recipient can harvest this Hive.");
      return;
    }

    if (!thankYou.trim()) {
      setHarvestResult("Please write a thank-you message first.");
      return;
    }

    setHarvesting(true);

    try {
      const res = await fetch("/api/harvest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hiveId,
          token, // ✅ protect harvest
          thankYouMessage: thankYou.trim(),
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        setHarvesting(false);
        setHarvestResult(`Harvest failed. Status ${res.status}.`);
        console.log("Raw /api/harvest response:", text);
        return;
      }

      setHarvesting(false);

      if (!res.ok) {
        setHarvestResult(data.error ?? "Harvest failed.");
        return;
      }

      setHarvestResult(`Harvest complete. Emails sent: ${data.sent}`);
      await loadHive();
    } catch (e: any) {
      setHarvesting(false);
      setHarvestResult(e?.message ?? "Harvest failed.");
    }
  }

  if (loadingHive) {
    return (
      <main className="min-h-screen p-8 max-w-2xl mx-auto">
        <p>Loading Hive...</p>
      </main>
    );
  }

  if (error || !hive) {
    return (
      <main className="min-h-screen p-8 max-w-2xl mx-auto">
        <p className="text-red-600">Could not load Hive: {error ?? "Unknown error"}</p>
      </main>
    );
  }

  const totalBees = hive.bee_count ?? 0;
  const alreadyHarvested = Boolean(hive.harvest_notified_at);

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold">{hive.title}</h1>
      <p className="mt-2 text-gray-600">
        A Hive has been created for <span className="font-medium">{hive.recipient_name}</span>.
      </p>

      <div className="mt-4 text-sm text-gray-500">
        <p>Bees gathered: {totalBees}</p>
        <p>Closes at: {new Date(hive.closes_at).toLocaleString()}</p>
        {hive.reveal_at && <p>Reveal at: {new Date(hive.reveal_at).toLocaleString()}</p>}
      </div>

      {!authorized && (
        <div className="mt-6 rounded-2xl border p-4 text-sm text-gray-700">
          <p className="font-medium">Privacy note</p>
          <p className="mt-1">
            Messages and contributor names are only visible to the moderator and recipient.
          </p>
        </div>
      )}

      {/* Harvest (only for authorized viewers) */}
      {authorized && isClosed && (
        <section className="mt-8 rounded-2xl border p-6">
          <h2 className="text-xl font-semibold">Harvest</h2>

          {alreadyHarvested ? (
            <p className="mt-2 text-gray-700">
              This Hive has already been harvested and notifications were sent.
            </p>
          ) : (
            <>
              <p className="mt-1 text-gray-600">
                The Hive is closed. Write a thank-you message to send to contributors who opted in.
              </p>

              <textarea
                className="mt-4 w-full rounded-lg border p-2 min-h-[120px]"
                value={thankYou}
                onChange={(e) => setThankYou(e.target.value)}
                placeholder="Write a thank-you message..."
              />

              <button
                onClick={harvestAndSend}
                disabled={harvesting}
                className="mt-4 w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
              >
                {harvesting ? "Harvesting..." : "Harvest & Send Thank-you"}
              </button>

              {harvestResult && <p className="mt-3 text-sm text-gray-700">{harvestResult}</p>}
            </>
          )}
        </section>
      )}

      {/* Contribution box */}
      <section className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Add your honey</h2>
        <p className="mt-1 text-gray-600">
          Your message will be shared privately with {hive.recipient_name}.
        </p>

        {isClosed ? (
          <p className="mt-4 text-gray-700">This Hive is closed. No new honey can be added.</p>
        ) : (
          <>
            {!submitted ? (
              <>
                {!isPreviewing ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium">Your name</label>
                      <input
                        className="mt-1 w-full rounded-lg border p-2"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Darrell"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium">Your message</label>
                      <textarea
                        className="mt-1 w-full rounded-lg border p-2 min-h-[120px]"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={`Write something real for ${hive.recipient_name}...`}
                      />
                    </div>

                    {submitError && <p className="text-red-600 text-sm">{submitError}</p>}

                    <button
                      onClick={startPreview}
                      className="w-full rounded-xl bg-black text-white py-3 font-medium"
                    >
                      Review your honey
                    </button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">Preview</p>
                    <div className="mt-2 rounded-xl border p-4">
                      <p className="font-medium">{name.trim()}</p>
                      <p className="mt-2 whitespace-pre-wrap text-gray-800">{note.trim()}</p>
                    </div>

                    {submitError && <p className="mt-3 text-red-600 text-sm">{submitError}</p>}

                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => setIsPreviewing(false)}
                        className="flex-1 rounded-xl border py-3 font-medium"
                        disabled={submitting}
                      >
                        Edit
                      </button>
                      <button
                        onClick={submitMessage}
                        className="flex-1 rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
                        disabled={submitting}
                      >
                        {submitting ? "Sending..." : "Add to the Hive"}
                      </button>
                    </div>

                    <p className="mt-3 text-xs text-gray-500">
                      Take a moment to make sure this is exactly what you want to share.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4">
                <p className="text-gray-800 font-medium">Thank you. Your honey was added.</p>

                <div className="mt-4 rounded-xl border p-4">
                  <p className="text-sm text-gray-600">
                    Want to receive a message when the Hive is harvested and {hive.recipient_name} sends a thank-you?
                  </p>

                  <div className="mt-3 flex gap-2">
                    <input
                      className="flex-1 rounded-lg border p-2"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Optional email address"
                    />
                    <button
                      onClick={saveEmailForHarvest}
                      disabled={savingEmail}
                      className="rounded-lg bg-black text-white px-4 py-2 font-medium disabled:opacity-50"
                    >
                      {savingEmail ? "Saving..." : "Notify me"}
                    </button>
                  </div>

                  {emailSaved && <p className="mt-2 text-sm text-green-700">Saved. You’ll be notified at harvest.</p>}
                  {emailError && <p className="mt-2 text-sm text-red-600">{emailError}</p>}
                </div>

                <div className="mt-4 rounded-xl border p-4">
                  <p className="text-sm text-gray-600">Know someone else who would like to contribute?</p>
                  <p className="mt-2 break-all text-gray-800">{contributorShareUrl}</p>
                  <button onClick={copyContributorLink} className="mt-3 w-full rounded-xl border py-3 font-medium">
                    Copy contributor link
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                    setEmailSaved(false);
                    setEmailError(null);
                  }}
                  className="mt-4 w-full rounded-xl border py-3 font-medium"
                >
                  Add another message
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Messages display (authorized only) */}
      <section className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Honey in the Hive</h2>

        {!authorized ? (
          <p className="mt-2 text-gray-700">
            Messages are private and only visible to the moderator and recipient.
          </p>
        ) : !isRevealed ? (
          <p className="mt-2 text-gray-700">
            This Hive is in <span className="font-medium">Reveal Mode</span>. Messages will be visible at reveal time.
          </p>
        ) : loadingMessages ? (
          <p className="mt-2">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="mt-2 text-gray-700">No honey yet. Be the first to add a message.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="rounded-xl border p-4">
                <p className="font-medium">{m.contributor_name}</p>
                <p className="mt-2 whitespace-pre-wrap text-gray-800">{m.message}</p>
                <p className="mt-2 text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
