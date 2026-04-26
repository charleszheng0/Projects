import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key so we can update status regardless of RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const action = searchParams.get("action");

  if (!id || !["approve", "reject"].includes(action ?? "")) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  const status = action === "approve" ? "approved" : "rejected";

  const { error } = await supabase
    .from("quests")
    .update({ status })
    .eq("id", id);

  if (error) {
    return new NextResponse(`Failed to update quest: ${error.message}`, { status: 500 });
  }

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head><title>queued</title><style>
        body { font-family: sans-serif; background: #FEFCF3; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: white; border-radius: 20px; padding: 40px; max-width: 400px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .label { color: #16A34A; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
        h1 { font-size: 24px; font-weight: 800; color: #1a1a1a; margin: 0 0 8px; }
        p { color: #78716c; font-size: 14px; margin: 0; }
      </style></head>
      <body>
        <div class="card">
          <p class="label">queued</p>
          <h1>${status === "approved" ? "✅ Quest approved!" : "❌ Quest rejected"}</h1>
          <p>The quest has been ${status}. ${status === "approved" ? "It's now live in the feed." : "The submitter won't be notified."}</p>
        </div>
      </body>
    </html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
