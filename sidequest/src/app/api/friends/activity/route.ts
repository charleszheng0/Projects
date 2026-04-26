import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");

  if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user_id},addressee_id.eq.${user_id}`);

  if (!friendships || friendships.length === 0) {
    return NextResponse.json({ activity: [] });
  }

  const friendIds = friendships.map((f: { requester_id: string; addressee_id: string }) =>
    f.requester_id === user_id ? f.addressee_id : f.requester_id
  );

  const [{ data: userQuestsRaw }, { data: profiles }] = await Promise.all([
    supabase
      .from("user_quests")
      .select("*, quests(*)")
      .in("user_id", friendIds)
      .in("status", ["done", "want"])
      .order("completed_at", { ascending: false })
      .limit(30),
    supabase.from("profiles").select("id, username").in("id", friendIds),
  ]);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p: { id: string; username: string }) => [p.id, p])
  );

  const activity = (userQuestsRaw ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    profile: profileMap[row.user_id as string] ?? null,
  }));

  return NextResponse.json({ activity });
}
