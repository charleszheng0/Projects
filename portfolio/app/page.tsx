import { BrainCanvas } from "../components/BrainCanvas";
import { MotionReveal } from "../components/MotionReveal";
import { NameReveal } from "../components/NameReveal";
import { ScrollSections } from "../components/ScrollSections";

export default function HomePage() {
  return (
    <main className="h-screen px-6 pb-20 pt-28 md:px-16">
      <section className="relative flex h-full items-center justify-start">
        <BrainCanvas
          color="#A77BFF"
          speed={0.0628}
          density={5200}
          sensitivity={0.12}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[min(70vw,520px)] w-[min(70vw,520px)] -translate-x-1/2 -translate-y-1/2 opacity-80"
        />
        <div className="absolute left-0 top-1/2 z-10 w-full max-w-2xl -translate-y-1/2 pl-8 space-y-6 text-left">
          <MotionReveal>
            <div className="text-[10px] uppercase tracking-[0.4em] text-muted">
              Hey, I'm
            </div>
            <NameReveal />
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <p className="max-w-xl text-lg text-ink">
              Placeholder intro statement about your focus and direction.
            </p>
          </MotionReveal>
          <MotionReveal delay={0.2}>
            <p className="font-mono text-sm uppercase tracking-[0.3em] text-accent">
              A builder that thinks change.
            </p>
          </MotionReveal>
          <MotionReveal delay={0.3}>
            <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.2em] text-muted">
              <span className="hud-border px-3 py-1">Live Project</span>
              <span className="hud-border px-3 py-1">Research in Progress</span>
            </div>
          </MotionReveal>
        </div>
      </section>

      <ScrollSections title="Signal Archive" count={0} />
    </main>
  );
}
