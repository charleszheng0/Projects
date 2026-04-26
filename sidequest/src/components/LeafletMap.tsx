"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Quest } from "@/types";

const TRACK_COLORS: Record<string, string> = {
  money: "#3b82f6",
  health: "#22c55e",
  eco: "#10b981",
  fun: "#a855f7",
};

const TRACK_EMOJIS: Record<string, string> = {
  money: "💰",
  health: "🏃",
  eco: "🌱",
  fun: "🎉",
};

function createPinIcon(track: string) {
  const color = TRACK_COLORS[track] ?? "#78716c";
  const emoji = TRACK_EMOJIS[track] ?? "📍";
  return L.divIcon({
    html: `<div style="background:${color};width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;">${emoji}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function FlyToLocation({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 13, { animate: true, duration: 1.5 });
  }, [position, map]);
  return null;
}

interface Props {
  quests: Quest[];
  userLocation: [number, number] | null;
  onQuestSelect: (quest: Quest) => void;
}

export default function LeafletMap({ quests, userLocation, onQuestSelect }: Props) {
  const center: [number, number] = userLocation ?? [40.7128, -74.006];

  return (
    <MapContainer center={center} zoom={12} style={{ height: "55vh", width: "100%" }} zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToLocation position={userLocation} />
      {userLocation && (
        <CircleMarker
          center={userLocation}
          radius={10}
          fillColor="#22c55e"
          color="white"
          weight={3}
          fillOpacity={1}
        />
      )}
      {quests
        .filter((q) => q.lat != null && q.lng != null)
        .map((quest) => (
          <Marker
            key={quest.id}
            position={[quest.lat!, quest.lng!]}
            icon={createPinIcon(quest.track)}
            eventHandlers={{ click: () => onQuestSelect(quest) }}
          />
        ))}
    </MapContainer>
  );
}
