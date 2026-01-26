import { NextResponse } from "next/server";

type FetchRequest = {
  url: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FetchRequest;

    if (!body?.url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(body.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (JobScraperBot/1.0)"
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Fetch failed: ${response.status}` },
        { status: response.status }
      );
    }

    const text = await response.text();
    const truncated = text.slice(0, 50000);

    return NextResponse.json({ content: truncated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
