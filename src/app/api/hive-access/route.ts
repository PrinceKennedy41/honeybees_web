import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { hiveId, token } = (await req.json()) as { hiveId: string; token?: string };

    if (!hiveId) return NextResponse.json({ error: "Missing hiveId" }, { status: 400 });
    if (!token) return NextResponse.json({ authorized: false });

    const { data, error } = await supabaseAdmin
      .from("hive_secrets")
      .select("moderator_token, recipient_token")
      .eq("hive_id", hiveId)
      .single();

    if (error || !data) return NextResponse.json({ authorized: false });

    const authorized = token === data.moderator_token || token === data.recipient_token;

    return NextResponse.json({ authorized });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

export {};
