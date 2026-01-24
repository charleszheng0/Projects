import { BrainCanvas } from "../../../components/BrainCanvas";
import { MotionReveal } from "../../../components/MotionReveal";
import { ScrollSections } from "../../../components/ScrollSections";

export default function ResearchPage() {
  return (
    <main className="px-6 pb-20 pt-28 md:px-16">
      <section className="relative flex min-h-[60vh] items-center justify-center">
        <BrainCanvas
          color="#7C4DFF"
          speed={0.0628}
          density={3000}
          sensitivity={0.06}
          className="pointer-events-none absolute right-12 top-1/2 h-[520px] w-[520px] -translate-y-1/2 opacity-70"
        />
        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
          <MotionReveal>
            <div className="text-[10px] uppercase tracking-[0.4em] text-muted">
              Projects / Research
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Research
            </h1>
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <p className="max-w-xl mx-auto text-lg text-ink">
              Placeholder for exploration, academic threads, and open questions.
            </p>
          </MotionReveal>
          <MotionReveal delay={0.2}>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#E6FAFF]">
              Minimal motion · White noise
            </p>
          </MotionReveal>
        </div>
      </section>

      <section className="mt-16 grid gap-6">
        <MotionReveal>
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
            Workstream
          </h2>
        </MotionReveal>
        <MotionReveal delay={0.1}>
          <div className="bg-black/40 p-5 text-sm text-muted">
            Placeholder research project details.
          </div>
        </MotionReveal>
      </section>
    </main>
  );
}
