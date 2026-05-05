import { NextResponse } from "next/server";
import { runEngine } from "@/engine/runEngine";
import type { EngineRequest } from "@/types/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: EngineRequest;
  try {
    body = (await req.json()) as EngineRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body.input !== "string" || typeof body.task !== "string") {
    return NextResponse.json({ error: "Missing required fields: input, task." }, { status: 400 });
  }

  try {
    const result = await runEngine(body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error." },
      { status: 500 },
    );
  }
}
