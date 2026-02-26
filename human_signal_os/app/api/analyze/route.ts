import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert communication coach. Analyze the following speech transcript. Return ONLY a JSON object with these exact fields:
- overallConfidenceScore (0-100 integer)
- sentences (array of objects, each with: text (string), confidenceScore (0-100), weakPhrases (array of strings found in that sentence that signal low confidence))
- biasFlags (array of strings describing weak language patterns, max 5)
- dominantEmotion (single word)
- reframedVersion (entire transcript rewritten to sound more confident)
Do not include any text outside the JSON object.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured. Add it to .env.local." },
      { status: 500 },
    );
  }

  let body: { transcript?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const transcript = body.transcript?.trim();
  if (!transcript) {
    return NextResponse.json({ error: "transcript is required." }, { status: 400 });
  }

  let claudeRes: Response;
  try {
    claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: transcript }],
      }),
    });
  } catch (err) {
    console.error("[/api/analyze] Network error reaching Anthropic:", err);
    return NextResponse.json(
      { error: "Could not reach Anthropic API. Check your network." },
      { status: 502 },
    );
  }

  if (!claudeRes.ok) {
    let msg = `Anthropic returned HTTP ${claudeRes.status}`;
    try {
      const errBody = await claudeRes.json();
      msg = errBody.error?.message ?? msg;
    } catch {}
    return NextResponse.json({ error: msg }, { status: claudeRes.status });
  }

  const claudeData = await claudeRes.json();
  const rawText: string = claudeData.content?.[0]?.text ?? "";

  // Strip optional markdown code fences before JSON parsing
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let analysis: unknown;
  try {
    analysis = JSON.parse(cleaned);
  } catch {
    console.error("[/api/analyze] JSON parse failed. Raw Claude response:\n", rawText);
    return NextResponse.json(
      { error: "Claude returned malformed JSON. See server logs." },
      { status: 500 },
    );
  }

  return NextResponse.json({ analysis });
}
