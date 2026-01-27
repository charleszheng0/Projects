import { useEffect, useState } from "react";
import ReputationDisplay from "../components/ReputationDisplay";
import { currentUserId, seedProfile } from "../data/mockData";
import { storage } from "../utils/storage";

export default function MyProfile() {
  const [profile, setProfile] = useState(seedProfile);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const stored = await storage.get(`profile_${currentUserId}`);
      if (stored?.value) {
        setProfile(JSON.parse(stored.value));
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    await storage.set(`profile_${currentUserId}`, JSON.stringify(profile));
    setStatus("Saved!");
    setTimeout(() => setStatus(""), 2000);
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <section className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          My Profile
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Keep your profile honest
        </h1>
        <p className="text-slate-600">
          Update your bio, interests, and accountability details.
        </p>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <label className="block text-sm text-slate-600">
          About
          <textarea
            value={profile.about}
            onChange={(e) => setProfile({ ...profile, about: e.target.value })}
            className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
            rows={3}
          />
        </label>
        <label className="block text-sm text-slate-600">
          Looking for
          <input
            value={profile.lookingFor}
            onChange={(e) =>
              setProfile({ ...profile, lookingFor: e.target.value })
            }
            className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
          />
        </label>
        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-full bg-[#1e40af] text-white text-sm font-semibold"
        >
          Save changes
        </button>
        {status && <p className="text-xs text-emerald-600">{status}</p>}
      </section>

      <ReputationDisplay userId={currentUserId} />
    </main>
  );
}
