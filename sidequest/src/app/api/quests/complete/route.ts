import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const XP_PER_QUEST = 30;

export async function POST(req: NextRequest) {
  const { user_id, quest_id, rating, note } = await req.json();

  if (!user_id || !quest_id || !rating) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error: uqError } = await supabase.from("user_quests").upsert(
    {
      user_id,
      quest_id,
      status: "done",
      rating,
      note: note || null,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,quest_id" }
  );

  if (uqError) return NextResponse.json({ error: uqError.message }, { status: 500 });

  const [{ data: quest }, { data: profile }] = await Promise.all([
    supabase.from("quests").select("track, community_rating, rating_count").eq("id", quest_id).single(),
    supabase.from("profiles").select("xp_total, xp_money, xp_health, xp_eco, xp_fun").eq("id", user_id).single(),
  ]);

  if (quest && profile) {
    const xpKey = `xp_${quest.track}` as keyof typeof profile;
    const currentXp = (profile[xpKey] as number) ?? 0;

    await supabase.from("profiles").update({
      xp_total: (profile.xp_total ?? 0) + XP_PER_QUEST,
      [xpKey]: currentXp + XP_PER_QUEST,
    }).eq("id", user_id);

    const count = (quest.rating_count ?? 0) + 1;
    const avg = ((quest.community_rating ?? 0) * (quest.rating_count ?? 0) + rating) / count;
    await supabase.from("quests").update({ community_rating: avg, rating_count: count }).eq("id", quest_id);
  }

  return NextResponse.json({ success: true, xp_earned: XP_PER_QUEST });
}
