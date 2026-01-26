import { NextResponse } from "next/server";

type AiRequest = {
  action:
    | "parseResume"
    | "extractJob"
    | "generateResume"
    | "generateCoverLetter"
    | "generateWhyThisRole";
  prompt: string;
  maxTokens?: number;
};

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AiRequest;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY" },
        { status: 500 }
      );
    }

    if (!body?.prompt || !body?.action) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: body.maxTokens ?? 3000,
        messages: [{ role: "user", content: body.prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Anthropic API error", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? "";

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
