import { BrainCanvas } from "../../components/BrainCanvas";
import { MotionReveal } from "../../components/MotionReveal";
import { ScrollSections } from "../../components/ScrollSections";

export default function SkillsPage() {
  return (
    <main className="px-6 pb-20 pt-28 md:px-16">
      <section className="relative flex min-h-[60vh] items-center justify-center">
        <BrainCanvas
          color="#A77BFF"
          speed={0.0628}
          density={3200}
          sensitivity={0.08}
          className="pointer-events-none absolute right-12 top-1/2 h-[520px] w-[520px] -translate-y-1/2 opacity-70"
        />
        <div className="relative z-10 max-w-2xl space-y-6">
          <MotionReveal>
            <div className="text-[10px] uppercase tracking-[0.4em] text-muted">
              Skills
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Systems + Tooling
            </h1>
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <p className="max-w-2xl text-lg text-ink">
              Placeholder for your technical stack, tools, and core strengths.
            </p>
          </MotionReveal>
        </div>
      </section>

      <section className="mt-16 space-y-6">
        <MotionReveal delay={0.2}>
          <div className="grid gap-4 md:grid-cols-2">
            {["Stack", "Languages", "Tools", "Frameworks"].map((item) => (
              <div
                key={item}
                className="hud-border bg-black/40 px-4 py-5 text-xs uppercase tracking-[0.3em] text-muted"
              >
                {item} — placeholder
              </div>
            ))}
          </div>
        </MotionReveal>
      </section>

      <ScrollSections title="Skills Signals" />
    </main>
  );
}
