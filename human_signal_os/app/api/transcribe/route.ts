import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY is not configured. Add it to .env.local." },
      { status: 500 },
    );
  }

  // Parse the multipart form sent by the client
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse form data." }, { status: 400 });
  }

  const audioEntry = formData.get("audio");
  if (!audioEntry || !(audioEntry instanceof Blob)) {
    return NextResponse.json({ error: 'No "audio" field in request.' }, { status: 400 });
  }

  const mimeType = audioEntry.type || "audio/webm";

  // Send raw audio bytes directly to Deepgram's REST API.
  // Deepgram accepts the blob as the request body with Content-Type set to
  // the audio mime type — no multipart encoding needed.
  let dgRes: Response;
  try {
    dgRes = await fetch("https://api.deepgram.com/v1/listen", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": mimeType,
      },
      body: await audioEntry.arrayBuffer(),
    });
  } catch (err) {
    console.error("[/api/transcribe] Network error reaching Deepgram:", err);
    return NextResponse.json(
      { error: "Could not reach Deepgram API. Check your network." },
      { status: 502 },
    );
  }

  if (!dgRes.ok) {
    let msg = `Deepgram returned HTTP ${dgRes.status}`;
    try {
      const body = await dgRes.json();
      msg = body.err_msg ?? body.message ?? msg;
    } catch {}
    return NextResponse.json({ error: msg }, { status: dgRes.status });
  }

  const data = await dgRes.json();
  const transcript =
    data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  return NextResponse.json({ transcript });
}
