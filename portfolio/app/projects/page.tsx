import { BrainCanvas } from "../../components/BrainCanvas";
import { MotionReveal } from "../../components/MotionReveal";

export default function ProjectsPage() {
  return (
    <main className="min-h-screen px-6 pb-20 pt-28 md:px-16">
      <section className="relative flex min-h-[60vh] items-center justify-center">
        <BrainCanvas
          color="#7C4DFF"
          speed={0.0628}
          density={4000}
          sensitivity={0.14}
          className="pointer-events-none absolute right-12 top-1/2 h-[520px] w-[520px] -translate-y-1/2 opacity-70"
        />
        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
          <MotionReveal>
            <div className="text-base md:text-lg uppercase tracking-[0.4em] text-muted inline-block">
              Projects
            </div>
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <p className="max-w-xl mx-auto text-base md:text-lg text-ink">
              Personal projects curated towards human behavior, games, AI/ML, engineering
            </p>
          </MotionReveal>
        </div>
      </section>

      <section className="mt-16 grid gap-6">
        <MotionReveal delay={0.05}>
          <div className="bg-black/40 p-5 text-base text-muted space-y-2">
            <div className="font-semibold text-ink">
              <a
                href="https://credit-card-concierge-beta.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Concierge ↗
              </a>
            </div>
            <p className="text-sm">
              Scores 2,000+ credit cards against your actual spending to find the best one for you. Next.js, TypeScript, Supabase, Vercel.
            </p>
          </div>
        </MotionReveal>
        <MotionReveal delay={0.1}>
          <div className="bg-black/40 p-5 text-base text-muted space-y-2">
            <div className="font-semibold text-ink">
              <a
                href="https://inflect-human-os.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Inflect ↗
              </a>
            </div>
            <p className="text-sm">
              Real-time behavioral coaching app that tracks facial landmarks and pose points via MediaPipe and gives live feedback. Next.js, TypeScript, MediaPipe, Deepgram, Claude.
            </p>
          </div>
        </MotionReveal>
        <MotionReveal delay={0.15}>
          <div className="bg-black/40 p-5 text-base text-muted space-y-2">
            <div className="font-semibold text-ink">
              <a
                href="https://pokergtotrainer.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Poker GTO Trainer ↗
              </a>
            </div>
            <p className="text-sm">
              Browser-based GTO poker trainer with EV analysis and street-by-street simulations.
            </p>
          </div>
        </MotionReveal>
        <MotionReveal delay={0.2}>
          <div className="bg-black/40 p-5 text-base text-muted space-y-2">
            <div className="font-semibold text-ink">
              <a
                href="https://drive.google.com/file/d/1hUgF__nSSOGQQBVPqkY8W0cmBD67-HOJ/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Expandable Dilator ↗
              </a>
            </div>
            <p className="text-sm">
              Prototype air-expandable biomedical dilator built with Dragon Skin 10 silicone.
            </p>
          </div>
        </MotionReveal>
      </section>

    </main>
  );
}
