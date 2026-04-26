import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { user_id } = await req.json();

  let preferences: Record<string, unknown> | null = null;
  let excludeIds: string[] = [];

  if (user_id) {
    const [{ data: profile }, { data: interacted }] = await Promise.all([
      supabase.from("profiles").select("preferences").eq("id", user_id).single(),
      supabase.from("user_quests").select("quest_id").eq("user_id", user_id),
    ]);
    preferences = profile?.preferences ?? null;
    excludeIds = interacted?.map((r: { quest_id: string }) => r.quest_id) ?? [];
  }

  const { data: allQuests } = await supabase
    .from("quests")
    .select("*")
    .eq("status", "approved");

  if (!allQuests || allQuests.length === 0) {
    return NextResponse.json({ quest: null });
  }

  let pool = allQuests.filter((q) => !excludeIds.includes(q.id));

  if (preferences) {
    const prefs = preferences as {
      tracks?: string[];
      time?: string;
      location?: string;
      energy?: string;
    };

    const filtered = pool.filter((q) => {
      if (prefs.tracks?.length && !prefs.tracks.includes(q.track)) return false;
      if (prefs.time && q.time_minutes > parseInt(prefs.time)) return false;
      if (prefs.location && prefs.location !== "anywhere" && q.location_type !== prefs.location && q.location_type !== "anywhere") return false;
      if (prefs.energy && q.energy_level !== parseInt(prefs.energy)) return false;
      return true;
    });

    if (filtered.length > 0) pool = filtered;
  }

  if (pool.length === 0) return NextResponse.json({ quest: null });

  const quest = pool[Math.floor(Math.random() * pool.length)];
  return NextResponse.json({ quest });
}
