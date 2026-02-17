import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(_req: Request) {
  return NextResponse.json({ ok: true });
}

// This line forces TypeScript to treat the file as a module no matter what.
export {};
