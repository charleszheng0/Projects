import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#f8f7f4] text-slate-900">
      <header className="px-6 py-6 max-w-6xl mx-auto flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Koina
          </p>
          <h1 className="text-2xl font-semibold text-[#1e40af]">
            Accountability-first dating
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/discovery"
            className="px-4 py-2 text-sm font-semibold text-[#1e40af] hover:underline"
          >
            Explore
          </Link>
          <Link
            to="/onboarding"
            className="px-5 py-2 rounded-full bg-[#1e40af] text-white text-sm font-semibold shadow hover:opacity-90"
          >
            Start your profile
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr] items-center">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-6xl font-semibold leading-tight">
              No ghosting. No filters. Just radical transparency.
            </h2>
            <p className="text-lg text-slate-600">
              Build connections that last with public accountability scores,
              personality-first matching, and verified honesty. Photos unlock
              after real conversation.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/onboarding"
                className="px-6 py-3 rounded-full bg-[#f97316] text-white font-semibold shadow hover:opacity-90"
              >
                Begin onboarding
              </Link>
              <Link
                to="/discovery"
                className="px-6 py-3 rounded-full border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100"
              >
                View the discovery feed
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                Public accountability scores
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🎤</span>
                Voice intro before photos
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📹</span>
                Video verification required
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-5">
            <h3 className="text-lg font-semibold text-slate-800">
              How Koina works
            </h3>
            <ol className="space-y-4 text-slate-600">
              <li>
                <span className="font-semibold text-slate-800">1.</span> Build a
                personality-first profile and complete the radical honesty
                prompts.
              </li>
              <li>
                <span className="font-semibold text-slate-800">2.</span> Match
                based on values and communication, not photos.
              </li>
              <li>
                <span className="font-semibold text-slate-800">3.</span> Earn
                accountability scores that protect everyone from ghosting.
              </li>
              <li>
                <span className="font-semibold text-slate-800">4.</span> Unlock
                photos after 20 messages or mutual agreement.
              </li>
            </ol>
          </div>
        </div>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Public Ghosting Scores",
              text: "Every profile shows communication reliability, response history, and verified date follow-through.",
            },
            {
              title: "Photos After Personality",
              text: "Match on voice and values first. Photos unlock only after trust-building.",
            },
            {
              title: "Radical Transparency",
              text: "Mandatory vulnerability prompts + video verification keep profiles honest.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
            >
              <h4 className="text-lg font-semibold text-slate-900">
                {feature.title}
              </h4>
              <p className="mt-2 text-slate-600">{feature.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="px-6 py-10 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Koina. Honest dating, finally.
      </footer>
    </div>
  );
};

export default Landing;
