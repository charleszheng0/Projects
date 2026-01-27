import { useState } from "react";

export default function Settings() {
  const [distance, setDistance] = useState(25);
  const [ageMin, setAgeMin] = useState(24);
  const [ageMax, setAgeMax] = useState(34);
  const [notifications, setNotifications] = useState(true);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <section className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          Settings
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Preferences & account
        </h1>
        <p className="text-slate-600">
          Control matching preferences and notification behavior.
        </p>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-sm text-slate-600">
            Distance radius ({distance} miles)
          </label>
          <input
            type="range"
            min="5"
            max="50"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            className="w-full mt-2"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            Age minimum
            <input
              type="number"
              value={ageMin}
              onChange={(e) => setAgeMin(Number(e.target.value))}
              className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
            />
          </label>
          <label className="text-sm text-slate-600">
            Age maximum
            <input
              type="number"
              value={ageMax}
              onChange={(e) => setAgeMax(Number(e.target.value))}
              className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
            />
          </label>
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
          />
          Enable accountability alerts and match notifications
        </label>
        <button className="px-5 py-2 rounded-full bg-[#1e40af] text-white text-sm font-semibold">
          Save preferences
        </button>
      </section>
    </main>
  );
}
