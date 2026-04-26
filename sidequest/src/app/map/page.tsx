"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Navigation, MapPin, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import QuestCard from "@/components/QuestCard";
import type { Quest } from "@/types";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-stone-200 flex items-center justify-center" style={{ height: "55vh" }}>
      <p className="text-stone-400 text-sm">Loading map...</p>
    </div>
  ),
});

export default function MapPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  useEffect(() => {
    supabase
      .from("quests")
      .select("*")
      .eq("status", "approved")
      .not("lat", "is", null)
      .then(({ data }) => {
        if (data) setQuests(data as Quest[]);
      });

    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => setLocationDenied(true)
    );
  }, []);

  function requestLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocationDenied(false);
      },
      () => setLocationDenied(true)
    );
  }

  const mappedCount = quests.filter((q) => q.lat != null && q.lng != null).length;

  return (
    <div className="flex flex-col h-screen">
      {/* Map */}
      <div className="relative flex-shrink-0" style={{ height: "55vh" }}>
        <LeafletMap quests={quests} userLocation={userLocation} onQuestSelect={setSelectedQuest} />

        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 pt-12 px-4 z-[1000] pointer-events-none">
          <div className="bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3 pointer-events-auto">
            <Navigation size={16} className="text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-400">
                {userLocation ? "Your current location" : "Location not set"}
              </p>
              <p className="text-sm font-semibold text-stone-900">
                {mappedCount} mapped quest{mappedCount !== 1 ? "s" : ""} nearby
              </p>
            </div>
          </div>
        </div>

        {/* Location denied banner */}
        {locationDenied && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000]">
            <div className="bg-stone-900/90 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-white text-xs">Location access denied</p>
              <button
                onClick={requestLocation}
                className="text-green-400 text-xs font-semibold shrink-0"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quest bottom sheet */}
      {selectedQuest && (
        <div className="absolute bottom-20 left-0 right-0 z-[1000] px-4">
          <div className="bg-white rounded-3xl shadow-xl border border-stone-100 max-w-[430px] mx-auto">
            <div className="flex items-center justify-between px-5 pt-4 pb-1">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Quest details</p>
              <button onClick={() => setSelectedQuest(null)}>
                <X size={18} className="text-stone-400" />
              </button>
            </div>
            <div className="px-4 pb-4">
              <QuestCard quest={selectedQuest} compact />
            </div>
          </div>
        </div>
      )}

      {/* Nearby quest list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={14} className="text-green-600" />
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
            All approved quests
          </h2>
        </div>

        {quests.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-stone-400 text-sm">No quests have been approved yet.</p>
          </div>
        ) : (
          quests.map((q) => <QuestCard key={q.id} quest={q} compact onClick={() => setSelectedQuest(q)} />)
        )}
      </div>
    </div>
  );
}
