import { useEffect, useMemo, useState } from "react";
import ReputationDisplay from "./ReputationDisplay";
import { discoveryProfiles, matchSeed } from "../data/mockData";
import { storage } from "../utils/storage";

const BlindDiscoveryFeed = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const currentProfile = useMemo(
    () => discoveryProfiles[currentIndex % discoveryProfiles.length],
    [currentIndex]
  );

  useEffect(() => {
    const seedMatches = async () => {
      const existing = await storage.get("matches");
      if (!existing?.value) {
        await storage.set("matches", JSON.stringify(matchSeed));
      }
    };
    seedMatches();
  }, []);

  async function loadNextProfile() {
    setIsLoadingNext(true);
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setIsLoadingNext(false);
    }, 250);
  }

  async function handleInterested() {
    const stored = await storage.get("matches");
    const matches = stored?.value ? JSON.parse(stored.value) : [];
    const exists = matches.find((match: any) => match.userId === currentProfile.userId);
    if (!exists) {
      matches.unshift({
        id: `match_${currentProfile.userId}`,
        userId: currentProfile.userId,
        name: currentProfile.name,
        status: "active",
        lastMessage: "Mutual interest! Start a conversation.",
        lastUpdated: new Date().toISOString(),
        photosUnlocked: false,
        messages: [],
      });
      await storage.set("matches", JSON.stringify(matches));
    }
    loadNextProfile();
  }

  function handleNotInterested() {
    loadNextProfile();
  }

  if (isLoadingNext || !currentProfile) {
    return (
      <div className="p-10 text-center text-slate-500 animate-pulse">
        Finding your next blind match...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 relative">
        <div className="h-64 bg-slate-200 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=60')] bg-cover blur-xl opacity-40" />
          <div className="relative z-10 text-center p-6 bg-white/40 backdrop-blur-md rounded-xl shadow-lg border border-white/40">
            <span className="text-4xl mb-2 block">🔒</span>
            <p className="font-bold text-slate-800">
              Photos unlock after you connect
            </p>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-slate-900 mb-1">
              {currentProfile.name}, {currentProfile.age}
            </h2>
            <p className="text-slate-500 font-medium flex items-center">
              <span className="mr-1">📍</span> {currentProfile.location}
            </p>
          </div>

          <div className="inline-flex items-center bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full mb-8 border border-emerald-100">
            <span className="font-bold text-lg mr-2">
              {currentProfile.compatibilityScore}%
            </span>
            <span className="text-sm font-medium">
              Compatible based on personality & values
            </span>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl mb-8 border border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
              🎤 Voice Intro
            </h3>
            <audio controls src={currentProfile.voiceIntro.audioUrl} className="w-full" />
            <p className="text-right text-xs text-slate-400 mt-2">
              {currentProfile.voiceIntro.duration}s
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Personality Traits</h3>
            <div className="space-y-3">
              {Object.entries(currentProfile.personalityTest).map(
                ([trait, score]: [string, any]) => (
                  <div key={trait}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize font-medium text-slate-700">
                        {trait}
                      </span>
                      <span className="text-slate-400">{score}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-[#1e40af] h-2 rounded-full opacity-80"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-3">About</h3>
            <p className="text-lg text-slate-600 leading-relaxed italic">
              "{currentProfile.about}"
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {currentProfile.interests.map((interest: string) => (
                <span
                  key={interest}
                  className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
              Values
            </h3>
            <div className="flex flex-wrap gap-2">
              {currentProfile.values.map((value: string) => (
                <span
                  key={value}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-2">Looking For</h3>
            <p className="text-slate-600">{currentProfile.lookingFor}</p>
          </div>

          <div className="mb-10 bg-rose-50 p-5 rounded-xl border border-rose-100">
            <h3 className="text-rose-800 font-bold mb-2 flex items-center">
              <span className="mr-2">🚫</span> Deal-breakers
            </h3>
            <ul className="list-disc list-inside text-rose-700 space-y-1">
              {currentProfile.dealbreakers.map((db: string, idx: number) => (
                <li key={idx}>{db}</li>
              ))}
            </ul>
          </div>

          <ReputationDisplay userId={currentProfile.userId} />

          <div className="mt-8 p-4 bg-amber-50 text-amber-800 text-sm rounded-lg flex items-start">
            <span className="mr-2 text-lg">💡</span>
            <p>
              If you both express interest, you'll match and can start messaging.
              Photos unlock after 20 messages or mutual agreement.
            </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-6 z-50">
        <button
          onClick={handleNotInterested}
          className="w-16 h-16 flex items-center justify-center bg-white text-slate-400 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 hover:scale-110 hover:text-rose-500 transition-all duration-300"
          aria-label="Pass"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <button
          onClick={handleInterested}
          className="w-20 h-20 flex items-center justify-center bg-[#1e40af] text-white rounded-full shadow-xl hover:bg-[#162f7b] hover:scale-110 transition-all duration-300 transform"
          aria-label="Like"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BlindDiscoveryFeed;
