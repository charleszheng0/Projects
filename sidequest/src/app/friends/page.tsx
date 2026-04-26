"use client";

import { useState, useEffect } from "react";
import { Search, UserPlus, Check, X, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { TRACK_META, getRank } from "@/types";
import type { Quest } from "@/types";
import clsx from "clsx";

const AVATAR_COLORS = [
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function Avatar({ username, size = "md" }: { username: string; size?: "sm" | "md" | "lg" }) {
  const color = AVATAR_COLORS[(username?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
  const sizeClass = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" }[size];
  return (
    <div className={clsx("rounded-full flex items-center justify-center font-bold shrink-0", color, sizeClass)}>
      {(username ?? "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

type Tab = "leaderboard" | "activity" | "add";

interface FriendProfile {
  id: string;
  username: string;
  xp_total: number;
}

interface ActivityItem {
  id: string;
  user_id: string;
  status: string;
  rating?: number;
  note?: string;
  completed_at?: string;
  quests: Quest;
  profile: { username: string } | null;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  profiles?: { username: string } | { username: string }[];
}

interface SearchResult {
  id: string;
  username: string;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [pendingIn, setPendingIn] = useState<Friendship[]>([]);
  const [pendingOut, setPendingOut] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    setLoading(true);

    // Load accepted friendships
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const friendIds = (friendships ?? []).map((f: { requester_id: string; addressee_id: string }) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    // Load friend profiles for leaderboard
    if (friendIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, xp_total")
        .in("id", friendIds)
        .order("xp_total", { ascending: false });
      setFriends((profiles as FriendProfile[]) ?? []);
    } else {
      setFriends([]);
    }

    // Load incoming pending requests
    const { data: incoming } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status, profiles!friendships_requester_id_fkey(username)")
      .eq("addressee_id", user.id)
      .eq("status", "pending");
    setPendingIn(((incoming ?? []) as unknown as Friendship[]));

    // Load outgoing pending
    const { data: outgoing } = await supabase
      .from("friendships")
      .select("addressee_id")
      .eq("requester_id", user.id)
      .eq("status", "pending");
    setPendingOut(new Set((outgoing ?? []).map((f: { addressee_id: string }) => f.addressee_id)));

    // Load activity from API
    if (friendIds.length > 0) {
      const res = await fetch(`/api/friends/activity?user_id=${user.id}`);
      const data = await res.json();
      setActivity(data.activity ?? []);
    }

    setLoading(false);
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", `${q}%`)
      .neq("id", user?.id ?? "")
      .limit(8);
    setSearchResults((data as SearchResult[]) ?? []);
  }

  async function sendRequest(addresseeId: string) {
    if (!user) return;
    await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: "pending",
    });
    setPendingOut((s) => new Set(s).add(addresseeId));
  }

  async function respondToRequest(friendshipId: string, accept: boolean) {
    if (accept) {
      await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    } else {
      await supabase.from("friendships").delete().eq("id", friendshipId);
    }
    setPendingIn((prev) => prev.filter((f) => f.id !== friendshipId));
    if (accept) loadData();
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="px-4 pt-12 pb-4">
      <div className="mb-5">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-1">queued</p>
        <h1 className="text-2xl font-bold text-stone-900">Friends</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-stone-100 rounded-2xl p-1 mb-5 gap-1">
        {([["leaderboard", "Rankings"], ["activity", "Activity"], ["add", "Add"]] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex-1 py-2 rounded-xl text-sm font-semibold transition-all",
              tab === t ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-400 text-sm">Loading...</div>
      ) : (
        <>
          {/* Leaderboard */}
          {tab === "leaderboard" && (
            <div>
              {friends.length === 0 ? (
                <div className="text-center py-16">
                  <Users size={40} className="text-stone-300 mx-auto mb-3" />
                  <p className="font-semibold text-stone-500">No friends yet</p>
                  <p className="text-stone-400 text-sm mt-1">Add friends to see how you stack up.</p>
                </div>
              ) : (
                <div className="bg-stone-900 rounded-3xl p-5 space-y-3">
                  <p className="text-stone-400 text-xs font-semibold uppercase tracking-widest mb-4">Friend rankings</p>
                  {friends.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-3">
                      <span className="text-xl w-7 text-center">{medals[i] ?? `#${i + 1}`}</span>
                      <Avatar username={f.username} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">@{f.username}</p>
                        <p className="text-stone-400 text-xs">{getRank(f.xp_total ?? 0)}</p>
                      </div>
                      <span className="text-green-400 text-sm font-bold shrink-0">{(f.xp_total ?? 0).toLocaleString()} xp</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity */}
          {tab === "activity" && (
            <div className="space-y-3">
              {activity.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">🌟</p>
                  <p className="font-semibold text-stone-500">No activity yet</p>
                  <p className="text-stone-400 text-sm mt-1">Add friends to see their completed quests.</p>
                </div>
              ) : (
                activity.map((item) => {
                  const quest = item.quests as Quest;
                  if (!quest) return null;
                  const meta = TRACK_META[quest.track];
                  return (
                    <div key={item.id} className="bg-white rounded-3xl shadow-card border border-stone-100 p-4">
                      <div className="flex gap-3">
                        <Avatar username={item.profile?.username ?? "?"} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                            <span className="font-semibold text-stone-900 text-sm">@{item.profile?.username ?? "someone"}</span>
                            <span className="text-stone-400 text-sm">
                              {item.status === "done" ? "completed" : "wants to do"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded-full", meta.bg, meta.color)}>{meta.emoji}</span>
                            <p className="text-sm font-medium text-stone-800 truncate">{quest.title}</p>
                          </div>
                          {item.rating && (
                            <div className="flex items-center gap-1 mt-1.5">
                              {Array.from({ length: item.rating }).map((_, i) => (
                                <span key={i} className="text-yellow-400 text-xs">★</span>
                              ))}
                            </div>
                          )}
                          {item.note && (
                            <p className="text-xs text-stone-500 mt-1.5 italic leading-relaxed">&ldquo;{item.note}&rdquo;</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Add friends */}
          {tab === "add" && (
            <div className="space-y-5">
              {/* Incoming requests */}
              {pendingIn.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                    Friend requests ({pendingIn.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingIn.map((req) => {
                      const profileValue = req.profiles;
                      const username = Array.isArray(profileValue)
                        ? profileValue[0]?.username ?? "Unknown"
                        : profileValue?.username ?? "Unknown";
                      return (
                        <div key={req.id} className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3">
                          <Avatar username={username} />
                          <span className="flex-1 font-semibold text-stone-900 text-sm">@{username}</span>
                          <button
                            onClick={() => respondToRequest(req.id, true)}
                            className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center"
                          >
                            <Check size={16} className="text-white" />
                          </button>
                          <button
                            onClick={() => respondToRequest(req.id, false)}
                            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center"
                          >
                            <X size={16} className="text-stone-500" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search */}
              <div>
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Search by username</h3>
                <div className="relative mb-3">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Find people..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-stone-900 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((result) => {
                      const alreadyFriend = friends.some((f) => f.id === result.id);
                      const pending = pendingOut.has(result.id);
                      return (
                        <div key={result.id} className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3">
                          <Avatar username={result.username} />
                          <span className="flex-1 font-semibold text-stone-900 text-sm">@{result.username}</span>
                          {alreadyFriend ? (
                            <span className="text-xs text-green-600 font-semibold px-3 py-1.5 bg-green-50 rounded-full">Friends</span>
                          ) : pending ? (
                            <span className="text-xs text-stone-400 font-semibold px-3 py-1.5 bg-stone-100 rounded-full">Sent</span>
                          ) : (
                            <button
                              onClick={() => sendRequest(result.id)}
                              className="flex items-center gap-1.5 bg-stone-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
                            >
                              <UserPlus size={13} />
                              Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-stone-400 text-sm text-center py-6">No users found for &ldquo;{searchQuery}&rdquo;</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
