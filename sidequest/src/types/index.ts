export type QuestTrack = "money" | "health" | "eco" | "fun";

export type QuestStatus = "pending" | "approved" | "rejected";

export type UserQuestStatus = "want" | "done" | "skipped";

export interface Quest {
  id: string;
  title: string;
  description: string;
  track: QuestTrack;
  time_minutes: number;
  location_type: "home" | "city" | "outdoors" | "anywhere";
  energy_level: 1 | 2 | 3;
  tags: string[];
  status: QuestStatus;
  created_by: string;
  created_at: string;
  lat?: number;
  lng?: number;
  address?: string;
  community_rating: number;
  rating_count: number;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  xp_total: number;
  xp_money: number;
  xp_health: number;
  xp_eco: number;
  xp_fun: number;
  streak_days: number;
  badges: Badge[];
  rank: string;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  track: QuestTrack;
  earned_at: string;
}

export interface CompletedQuest {
  id: string;
  user_id: string;
  quest_id: string;
  quest: Quest;
  rating: number;
  note?: string;
  completed_at: string;
  xp_earned: number;
}

export interface FriendActivity {
  user: UserProfile;
  action: "completed" | "wants";
  quest: Quest;
  timestamp: string;
  note?: string;
}

export const TRACK_META: Record<QuestTrack, { label: string; color: string; bg: string; emoji: string }> = {
  money: { label: "Finance", color: "text-blue-600", bg: "bg-blue-50", emoji: "💰" },
  health: { label: "Wellbeing", color: "text-green-600", bg: "bg-green-50", emoji: "🏃" },
  eco: { label: "Eco", color: "text-emerald-600", bg: "bg-emerald-50", emoji: "🌱" },
  fun: { label: "Fun & Social", color: "text-purple-600", bg: "bg-purple-50", emoji: "🎉" },
};

export const ENERGY_LABELS: Record<number, string> = {
  1: "Low key",
  2: "Moderate",
  3: "High energy",
};

export const RANK_THRESHOLDS = [
  { label: "Wanderer", min: 0, max: 499 },
  { label: "Explorer", min: 500, max: 1499 },
  { label: "Adventurer", min: 1500, max: 3999 },
  { label: "Pathfinder", min: 4000, max: 9999 },
  { label: "Legend", min: 10000, max: Infinity },
];

export function getRank(xp: number): string {
  return RANK_THRESHOLDS.find((r) => xp >= r.min && xp <= r.max)?.label ?? "Wanderer";
}
