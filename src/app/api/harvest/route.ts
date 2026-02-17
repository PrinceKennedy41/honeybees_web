import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { hiveId, thankYouMessage } = (await req.json()) as {
      hiveId: string;
      thankYouMessage: string;
    };

    if (!hiveId || !thankYouMessage?.trim()) {
      return NextResponse.json(
        { error: "Missing hiveId or thankYouMessage" },
        { status: 400 }
      );
    }

    // Load hive
    const { data: hive, error: hiveErr } = await supabaseAdmin
      .from("hives")
      .select("id, title, recipient_name, closes_at, harvest_notified_at")
      .eq("id", hiveId)
      .single();

    if (hiveErr || !hive) {
      return NextResponse.json({ error: "Hive not found" }, { status: 404 });
    }

    // Only allow harvest after close time
    const now = new Date();
    const closesAt = new Date(hive.closes_at);
    if (closesAt > now) {
      return NextResponse.json(
        { error: "Hive is not closed yet" },
        { status: 400 }
      );
    }

    // Prevent double-send
    if (hive.harvest_notified_at) {
      return NextResponse.json(
        { error: "Harvest emails already sent" },
        { status: 400 }
      );
    }

    // Save thank-you + harvest timestamps
    const { error: updateErr } = await supabaseAdmin
      .from("hives")
      .update({
        thank_you_message: thankYouMessage.trim(),
        harvested_at: now.toISOString(),
        harvest_notified_at: now.toISOString(),
      })
      .eq("id", hiveId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Get subscriber emails
    const { data: subs, error: subsErr } = await supabaseAdmin
      .from("harvest_subscribers")
      .select("email")
      .eq("hive_id", hiveId);

    if (subsErr) {
      return NextResponse.json({ error: subsErr.message }, { status: 500 });
    }

    const emails = (subs ?? [])
      .map((s) => (s.email ?? "").trim())
      .filter(Boolean);

    if (emails.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
    const hiveUrl = `${siteUrl}/hive/${hiveId}`;

    // For early testing. Later we’ll switch this to your verified domain.
    const from = "Honeybees <onboarding@resend.dev>";
    const subject = "The Hive has been harvested";

    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.4;">
        <h2>The Hive has been harvested</h2>
        <p>${escapeHtml(hive.recipient_name)}’s community gathered honey.</p>
        <hr/>
        <p><strong>Thank-you message:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(thankYouMessage.trim())}</p>
        <hr/>
        <p>View the Hive:</p>
        <p><a href="${hiveUrl}">${hiveUrl}</a></p>
      </div>
    `;

    // Send individually (simple + reliable for MVP)
    let sent = 0;
    for (const to of emails) {
      await resend.emails.send({ from, to, subject, html });
      sent += 1;
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Belt-and-suspenders: ensures TS always treats this file as a module
export {};
