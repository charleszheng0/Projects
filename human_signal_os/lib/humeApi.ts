/**
 * Hume AI — Expression Measurement API stub
 *
 * To activate real integration:
 * 1. Set HUME_API_KEY in .env.local
 * 2. In app/api/hume/route.ts, replace the stub with:
 *    POST https://api.hume.ai/v0/batch/jobs
 *    Headers: { X-Hume-Api-Key: process.env.HUME_API_KEY }
 *    Body: FormData with audio file
 *    Then poll GET /v0/batch/jobs/:id until complete, parse prosody predictions
 */

export interface HumeEmotionResult {
  confidence:  number;   // 0–1
  distress:    number;   // 0–1
  excitement:  number;   // 0–1
  calmness:    number;   // 0–1
  label:       "Calm" | "Tense" | "Energized" | "Distracted";
}

// Maps Hume emotion dimensions → a human-readable label
function deriveLabel(r: Omit<HumeEmotionResult, "label">): HumeEmotionResult["label"] {
  if (r.distress > 0.5)                          return "Tense";
  if (r.excitement > 0.55 && r.calmness < 0.4)  return "Energized";
  if (r.confidence < 0.35 && r.distress < 0.4)  return "Distracted";
  return "Calm";
}

/**
 * Send a 2-second audio blob to Hume AI via the Next.js proxy and get back
 * emotion dimensions. Falls back to neutral stub if the API is not configured.
 */
export async function analyzeAudioChunkHume(blob: Blob): Promise<HumeEmotionResult> {
  try {
    const res = await fetch("/api/hume", {
      method: "POST",
      body: blob,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return STUB_RESULT;
    const data = await res.json() as Omit<HumeEmotionResult, "label">;
    return { ...data, label: deriveLabel(data) };
  } catch {
    return STUB_RESULT;
  }
}

const STUB_RESULT: HumeEmotionResult = {
  confidence:  0.62,
  distress:    0.14,
  excitement:  0.38,
  calmness:    0.58,
  label:       "Calm",
};
