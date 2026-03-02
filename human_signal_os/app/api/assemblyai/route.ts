/**
 * POST /api/assemblyai
 *
 * Server-side proxy that submits audio to AssemblyAI for speech intelligence
 * (sentiment, filler detection, chapter markers), keeping ASSEMBLYAI_API_KEY
 * off the client.
 *
 * STUB: Returns empty result until ASSEMBLYAI_API_KEY is configured.
 *
 * To activate real AssemblyAI:
 * 1. Set ASSEMBLYAI_API_KEY in .env.local
 * 2. Uncomment the real implementation below.
 *
 * Real AssemblyAI flow:
 *   a. POST https://api.assemblyai.com/v2/upload → { upload_url }
 *   b. POST https://api.assemblyai.com/v2/transcript
 *      { audio_url: upload_url, sentiment_analysis: true, chapters: true }
 *   c. Poll GET /v2/transcript/:id until status === "completed"
 *   d. Parse .sentiment_analysis_results (sentences + sentiment) and .chapters
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  // ── Stub (no API key configured) ───────────────────────────────────────────
  if (!apiKey || apiKey === "your_assemblyai_api_key_here") {
    return NextResponse.json({
      sentences:   [],
      chapters:    [],
      fillerWords: [],
    });
  }

  // ── Real AssemblyAI integration ───────────────────────────────────────────
  // TODO: Uncomment when API key is ready
  /*
  try {
    const audioBlob = await req.blob();

    // Step 1: Upload audio
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/octet-stream" },
      body: audioBlob,
    });
    const { upload_url } = await uploadRes.json();

    // Step 2: Submit transcription job
    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_url: upload_url,
        sentiment_analysis: true,
        chapters: true,
      }),
    });
    const { id } = await transcriptRes.json();

    // Step 3: Poll for result
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { Authorization: apiKey },
      });
      const transcript = await pollRes.json();
      if (transcript.status === "completed") {
        // Map to our schema
        const FILLERS = /\b(um|uh|er|ah|like|basically|literally|actually|right|okay|so)\b/gi;
        const sentences = (transcript.sentiment_analysis_results ?? []).map((s: any) => {
          const fillerMatches = (s.text.match(FILLERS) ?? []).length;
          return {
            text:        s.text,
            start:       s.start,
            end:         s.end,
            sentiment:   s.sentiment,
            confidence:  s.confidence,
            fillerCount: fillerMatches,
          };
        });
        const chapters = (transcript.chapters ?? []).map((c: any) => ({
          start:    c.start,
          end:      c.end,
          headline: c.headline,
        }));
        const fillerWords: { text: string; timestamp: number }[] = [];
        for (const w of (transcript.words ?? [])) {
          if (FILLERS.test(w.text)) fillerWords.push({ text: w.text, timestamp: w.start });
          FILLERS.lastIndex = 0;
        }
        return NextResponse.json({ sentences, chapters, fillerWords });
      }
      if (transcript.status === "error") break;
    }
    return NextResponse.json({ sentences: [], chapters: [], fillerWords: [] });
  } catch (err) {
    console.error("[/api/assemblyai]", err);
    return NextResponse.json({ error: "AssemblyAI error" }, { status: 500 });
  }
  */

  return NextResponse.json({ sentences: [], chapters: [], fillerWords: [] });
}
