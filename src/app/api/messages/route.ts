import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { hiveId, token } = (await req.json()) as { hiveId: string; token?: string };

    if (!hiveId) return NextResponse.json({ error: "Missing hiveId" }, { status: 400 });
    if (!token) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

    const { data: secrets } = await supabaseAdmin
      .from("hive_secrets")
      .select("moderator_token, recipient_token")
      .eq("hive_id", hiveId)
      .single();

    if (!secrets) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

    const authorized = token === secrets.moderator_token || token === secrets.recipient_token;
    if (!authorized) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

    const { data: messages, error } = await supabaseAdmin
      .from("messages")
      .select("id,hive_id,contributor_name,message,created_at")
      .eq("hive_id", hiveId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ messages: messages ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

export {};
