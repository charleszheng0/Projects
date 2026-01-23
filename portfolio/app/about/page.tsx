import { BrainCanvas } from "../../components/BrainCanvas";
import { MotionReveal } from "../../components/MotionReveal";
import { ScrollSections } from "../../components/ScrollSections";

export default function AboutPage() {
  return (
    <main className="px-6 pb-20 pt-28 md:px-16">
      <section className="relative flex min-h-[60vh] items-center justify-center">
        <BrainCanvas
          color="#A77BFF"
          speed={0.0628}
          density={3600}
          sensitivity={0.12}
          className="pointer-events-none absolute right-12 top-1/2 h-[520px] w-[520px] -translate-y-1/2 opacity-70"
        />
        <div className="relative z-10 max-w-2xl space-y-6">
          <MotionReveal>
            <div className="text-[10px] uppercase tracking-[0.4em] text-muted">
              About
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Profile
            </h1>
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <p className="max-w-xl text-lg text-ink">
              I'm a Duke first year ECE/CS student that wants to build and
              deploy.
            </p>
          </MotionReveal>
          <MotionReveal delay={0.2}>
            <p className="text-sm text-muted">
              Placeholder for your personal summary, mission, and focus.
            </p>
          </MotionReveal>
        </div>
      </section>

      <section className="mt-16 grid gap-6">
        <MotionReveal>
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
            Education
          </h2>
        </MotionReveal>
        <MotionReveal delay={0.1}>
          <div className="hud-border bg-black/40 p-5 text-sm text-muted">
            Placeholder education details.
          </div>
        </MotionReveal>
      </section>

      <ScrollSections title="About Signals" />
    </main>
  );
}
