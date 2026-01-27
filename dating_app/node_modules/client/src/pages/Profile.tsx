import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReputationDisplay from "../components/ReputationDisplay";
import { storage } from "../utils/storage";
import { discoveryProfiles } from "../data/mockData";

export default function Profile() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [vulnerability, setVulnerability] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const stored = await storage.get(`profile_${id}`);
      if (stored?.value) {
        setProfile(JSON.parse(stored.value));
      } else {
        const fallback = discoveryProfiles.find((item) => item.userId === id);
        setProfile(fallback);
      }
      const vuln = await storage.get(`profile_${id}_vulnerability`);
      if (vuln?.value) {
        setVulnerability(JSON.parse(vuln.value));
      }
    };
    loadProfile();
  }, [id]);

  if (!profile) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10 text-slate-500">
        Loading profile...
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-slate-900">
              {profile.name}, {profile.age}
            </h1>
            <p className="text-slate-500">📍 {profile.location}</p>
            <p className="text-slate-600 italic">"{profile.about}"</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm uppercase tracking-wide text-slate-400">
              Voice Intro
            </h2>
            <audio controls src={profile.voiceIntro?.audioUrl} className="w-full mt-3" />
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Photos</h2>
        <div className="grid grid-cols-3 gap-3">
          {profile.photos?.images?.map((photo: any, idx: number) => (
            <div key={idx} className="relative">
              <img
                src={photo.url}
                alt={`Photo ${idx + 1}`}
                className="rounded-xl object-cover h-32 w-full"
              />
              <span className="absolute bottom-2 left-2 text-xs bg-white/90 px-2 py-1 rounded-full">
                ✓ Unfiltered
              </span>
            </div>
          ))}
        </div>
      </section>

      <ReputationDisplay userId={profile.userId} />

      {vulnerability && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Honest Self-Disclosure
            </h2>
            <span className="text-xs uppercase tracking-wide text-[#f97316]">
              Radical Transparency
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-600">
            {Object.entries(vulnerability).map(([key, value]: any) => (
              <div key={key} className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-2">{key}</h3>
                <p>{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
