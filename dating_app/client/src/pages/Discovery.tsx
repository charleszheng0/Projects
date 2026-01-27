import BlindDiscoveryFeed from "../components/BlindDiscoveryFeed";

export default function Discovery() {
  return (
    <main className="px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          Discovery Feed
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Connect on personality first
        </h1>
        <p className="text-slate-600 max-w-2xl">
          Photos unlock only after real conversation. Start with voice, values,
          and accountability scores.
        </p>
      </div>
      <BlindDiscoveryFeed />
    </main>
  );
}
