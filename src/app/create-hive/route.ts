import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function token() {
  // Simple strong token for MVP
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, recipientName, mode, revealAt, closesAt } = body as {
      title: string;
      recipientName: string;
      mode: "live" | "reveal";
      revealAt?: string;
      closesAt: string;
    };

    if (!title?.trim() || !recipientName?.trim() || !closesAt) {
      return NextResponse.json(
        { error: "Missing title, recipient name, or closesAt." },
        { status: 400 }
      );
    }

    if (mode === "reveal" && !revealAt) {
      return NextResponse.json({ error: "Reveal mode requires revealAt." }, { status: 400 });
    }

    const payload = {
      title: title.trim(),
      recipient_name: recipientName.trim(),
      mode,
      reveal_at: mode === "reveal" ? new Date(revealAt!).toISOString() : null,
      closes_at: new Date(closesAt).toISOString(),
    };

    // Create hive
    const { data: hive, error: hiveErr } = await supabaseAdmin
      .from("hives")
      .insert(payload)
      .select("id")
      .single();

    if (hiveErr || !hive) {
      return NextResponse.json({ error: hiveErr?.message ?? "Hive create failed." }, { status: 500 });
    }

    // Create secrets
    const moderator_token = token();
    const recipient_token = token();

    const { error: secErr } = await supabaseAdmin.from("hive_secrets").insert({
      hive_id: hive.id,
      moderator_token,
      recipient_token,
    });

    if (secErr) {
      return NextResponse.json({ error: secErr.message }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
    return NextResponse.json({
      hiveId: hive.id,
      contributorLink: `${siteUrl}/hive/${hive.id}`,
      moderatorLink: `${siteUrl}/hive/${hive.id}?token=${moderator_token}`,
      recipientLink: `${siteUrl}/hive/${hive.id}?token=${recipient_token}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

export {};

