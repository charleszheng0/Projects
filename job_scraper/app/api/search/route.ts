import { NextResponse } from "next/server";

type SearchRequest = {
  query: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchRequest;
    const apiKey = process.env.SERPAPI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing SERPAPI_API_KEY" },
        { status: 500 }
      );
    }

    if (!body?.query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", body.query);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("num", "10");

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Search API error", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const results = [
      ...(data.organic_results ?? []),
      ...(data.top_stories ?? []),
      ...(data.news_results ?? [])
    ].map((item: any) => ({
      title: item.title ?? item.link,
      url: item.link ?? item.url,
      snippet: item.snippet ?? item.snippet_highlighted_words?.join(" ") ?? ""
    }));

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
