import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storage } from "../utils/storage";
import { currentUserId, reputationSeed, seedProfile } from "../data/mockData";

const personalityQuestions = [
  {
    id: "openness",
    question: "I enjoy trying new experiences and exploring unfamiliar places.",
  },
  {
    id: "communication",
    question: "I prefer to discuss issues immediately rather than waiting.",
  },
  {
    id: "values",
    question:
      "Rank these in order of importance: Family time, Career growth, Personal growth, Adventure, Stability.",
  },
];

const vulnerabilityPrompts = [
  "What's something you're actively working to improve about yourself?",
  "What's a challenge you're currently facing in life?",
  "What's something about dating that's difficult for you?",
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(seedProfile);
  const [personalityAnswers, setPersonalityAnswers] = useState<Record<string, string>>({});
  const [voiceAccepted, setVoiceAccepted] = useState(false);
  const [photosAccepted, setPhotosAccepted] = useState(false);
  const [videoVerified, setVideoVerified] = useState(false);
  const [vulnerability, setVulnerability] = useState(
    vulnerabilityPrompts.reduce((acc, prompt) => {
      acc[prompt] = "";
      return acc;
    }, {} as Record<string, string>)
  );

  useEffect(() => {
    const hydrate = async () => {
      const stored = await storage.get(`profile_${currentUserId}`);
      if (stored?.value) {
        setProfile(JSON.parse(stored.value));
      }
    };
    hydrate();
  }, []);

  const canSubmit =
    profile.name &&
    profile.about.length >= 20 &&
    Object.values(personalityAnswers).length >= 2 &&
    voiceAccepted &&
    photosAccepted &&
    videoVerified &&
    Object.values(vulnerability).every((value) => value.trim().length >= 20);

  const handleSubmit = async () => {
    const personalityTest = {
      openness: Math.min(100, (personalityAnswers.openness?.length ?? 40) + 40),
      conscientiousness: Math.min(
        100,
        (personalityAnswers.communication?.length ?? 40) + 40
      ),
      extraversion: 60,
      agreeableness: Math.min(100, (personalityAnswers.values?.length ?? 40) + 40),
      neuroticism: 35,
    };

    await storage.set(
      `profile_${currentUserId}`,
      JSON.stringify({ ...profile, personalityTest })
    );
    await storage.set(
      `profile_${currentUserId}_vulnerability`,
      JSON.stringify({
        ...vulnerability,
        completedDate: new Date().toISOString(),
      })
    );
    await storage.set(
      `reputation_${currentUserId}`,
      JSON.stringify(reputationSeed)
    );
    navigate("/discovery");
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <section className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          Onboarding Flow
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Create your radical transparency profile
        </h1>
        <p className="text-slate-600">
          Every section is required so matches can trust the connection. Be
          real, be clear, be accountable.
        </p>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Basic Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-600">
            First name
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            Location
            <input
              value={profile.location}
              onChange={(e) =>
                setProfile({ ...profile, location: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            About you (min 20 chars)
            <textarea
              value={profile.about}
              onChange={(e) => setProfile({ ...profile, about: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
              rows={3}
            />
          </label>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Personality Assessment
        </h2>
        <p className="text-sm text-slate-500">
          Answer honestly. These scores drive compatibility.
        </p>
        <div className="space-y-4">
          {personalityQuestions.map((question) => (
            <label key={question.id} className="space-y-2 text-sm text-slate-600">
              {question.question}
              <input
                value={personalityAnswers[question.id] ?? ""}
                onChange={(e) =>
                  setPersonalityAnswers({
                    ...personalityAnswers,
                    [question.id]: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Voice Intro</h3>
          <p className="text-sm text-slate-500">
            Record a 30-60 second voice note for matches to hear first.
          </p>
          <button
            onClick={() => setVoiceAccepted(true)}
            className={`w-full px-4 py-2 rounded-lg text-sm font-semibold ${
              voiceAccepted
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {voiceAccepted ? "Voice Intro Uploaded" : "Upload voice intro"}
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Photo Upload</h3>
          <p className="text-sm text-slate-500">
            Add 3-5 recent, unfiltered photos for verification.
          </p>
          <button
            onClick={() => setPhotosAccepted(true)}
            className={`w-full px-4 py-2 rounded-lg text-sm font-semibold ${
              photosAccepted
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {photosAccepted ? "Photos Verified" : "Upload photos"}
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Video Verification</h3>
          <p className="text-sm text-slate-500">
            Record a short clip to verify you match your photos.
          </p>
          <button
            onClick={() => setVideoVerified(true)}
            className={`w-full px-4 py-2 rounded-lg text-sm font-semibold ${
              videoVerified
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {videoVerified ? "Verified" : "Start verification"}
          </button>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Radical Honesty Prompts
        </h2>
        <p className="text-sm text-slate-500">
          Minimum 20 characters each. These are visible to matches.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {vulnerabilityPrompts.map((prompt) => (
            <label key={prompt} className="space-y-2 text-sm text-slate-600">
              {prompt}
              <textarea
                value={vulnerability[prompt]}
                onChange={(e) =>
                  setVulnerability({ ...vulnerability, [prompt]: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                rows={3}
              />
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`px-6 py-3 rounded-full text-sm font-semibold ${
            canSubmit
              ? "bg-[#1e40af] text-white"
              : "bg-slate-200 text-slate-500 cursor-not-allowed"
          }`}
        >
          Complete profile & start matching
        </button>
        {!canSubmit && (
          <p className="text-sm text-slate-500">
            Complete all sections to continue.
          </p>
        )}
      </div>
    </main>
  );
}
