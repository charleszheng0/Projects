/**
 * POST /api/hume
 *
 * Server-side proxy that forwards audio blobs to the Hume AI Expression
 * Measurement API, keeping HUME_API_KEY off the client.
 *
 * STUB: Returns mock emotion data until HUME_API_KEY is configured.
 *
 * To activate real Hume AI:
 * 1. Set HUME_API_KEY in .env.local
 * 2. Uncomment the real implementation below and remove the stub return.
 *
 * Real Hume API flow:
 *   POST https://api.hume.ai/v0/batch/jobs
 *   Headers: { "X-Hume-Api-Key": key }
 *   Body: FormData { json: JSON.stringify({ models: { prosody: {} } }), file: audioBlob }
 *   → Returns { job_id }
 *   Then poll GET /v0/batch/jobs/:id until status="COMPLETED"
 *   Parse: predictions[0].results.prosody.grouped_predictions[0].predictions
 *   Map emotion names → confidence/distress/excitement/calmness
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  const apiKey = process.env.HUME_API_KEY;

  // ── Stub (no API key configured) ───────────────────────────────────────────
  if (!apiKey || apiKey === "your_hume_api_key_here") {
    // Return realistic-looking mock data with slight variation
    const base = 0.5 + (Math.random() - 0.5) * 0.2;
    return NextResponse.json({
      confidence:  Math.min(1, Math.max(0, base + 0.12)),
      distress:    Math.min(1, Math.max(0, 0.15 + (Math.random() - 0.5) * 0.1)),
      excitement:  Math.min(1, Math.max(0, 0.35 + (Math.random() - 0.5) * 0.15)),
      calmness:    Math.min(1, Math.max(0, base + 0.08)),
    });
  }

  // ── Real Hume AI integration ─────────────────────────────────────────────
  // TODO: Uncomment and implement when API key is ready
  /*
  try {
    const audioBlob = await req.blob();
    const form = new FormData();
    form.append("json", JSON.stringify({ models: { prosody: {} } }));
    form.append("file", audioBlob, "chunk.webm");

    const jobRes = await fetch("https://api.hume.ai/v0/batch/jobs", {
      method: "POST",
      headers: { "X-Hume-Api-Key": apiKey },
      body: form,
    });
    const { job_id } = await jobRes.json();

    // Poll for result (with timeout)
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const pollRes = await fetch(`https://api.hume.ai/v0/batch/jobs/${job_id}`, {
        headers: { "X-Hume-Api-Key": apiKey },
      });
      const poll = await pollRes.json();
      if (poll.state.status === "COMPLETED") {
        const preds = poll.results?.predictions?.[0]?.results?.prosody
          ?.grouped_predictions?.[0]?.predictions ?? [];
        // Map Hume emotion names to our schema
        const get = (name: string) => preds.find((p: any) => p.name === name)?.score ?? 0;
        return NextResponse.json({
          confidence:  get("Confidence"),
          distress:    get("Distress"),
          excitement:  get("Excitement"),
          calmness:    get("Calmness"),
        });
      }
    }
    return NextResponse.json({ confidence: 0.5, distress: 0.2, excitement: 0.3, calmness: 0.5 });
  } catch (err) {
    console.error("[/api/hume]", err);
    return NextResponse.json({ error: "Hume API error" }, { status: 500 });
  }
  */

  return NextResponse.json({ confidence: 0.5, distress: 0.2, excitement: 0.3, calmness: 0.5 });
}
