/**
 * AssemblyAI — Speech Intelligence API stub
 *
 * To activate real integration:
 * 1. Set ASSEMBLYAI_API_KEY in .env.local
 * 2. In app/api/assemblyai/route.ts, replace stub with:
 *    a. POST https://api.assemblyai.com/v2/upload  (get upload_url)
 *    b. POST https://api.assemblyai.com/v2/transcript
 *       { audio_url, sentiment_analysis: true, iab_categories: true, chapters: true }
 *    c. Poll GET /v2/transcript/:id until status === "completed"
 *    d. Parse sentences, chapters, sentiment_analysis_results
 */

export interface AssemblyAISentence {
  text:        string;
  start:       number;   // ms from start of audio
  end:         number;
  sentiment:   "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  confidence:  number;   // 0–1 from AssemblyAI
  fillerCount: number;   // count of filler words detected in this sentence
}

export interface AssemblyAIChapter {
  start:    number;   // ms
  end:      number;
  headline: string;
}

export interface AssemblyAIResult {
  sentences:   AssemblyAISentence[];
  chapters:    AssemblyAIChapter[];
  fillerWords: { text: string; timestamp: number }[];
}

/**
 * Submit an audio blob to AssemblyAI via the Next.js proxy.
 * Returns structured sentence/chapter/filler analysis.
 * Falls back to a minimal stub result if the API is not configured.
 */
export async function analyzeAudioAssemblyAI(blob: Blob): Promise<AssemblyAIResult> {
  try {
    const res = await fetch("/api/assemblyai", {
      method: "POST",
      body: blob,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return STUB_RESULT;
    return res.json() as Promise<AssemblyAIResult>;
  } catch {
    return STUB_RESULT;
  }
}

const STUB_RESULT: AssemblyAIResult = {
  sentences:   [],
  chapters:    [],
  fillerWords: [],
};
