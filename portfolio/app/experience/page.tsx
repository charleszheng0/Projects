import { BrainCanvas } from "../../components/BrainCanvas";
import { MotionReveal } from "../../components/MotionReveal";
import { ScrollSections } from "../../components/ScrollSections";

export default function ExperiencePage() {
  return (
    <main className="px-6 pb-20 pt-28 md:px-16">
      <section className="relative flex min-h-[60vh] items-center justify-center">
        <BrainCanvas
          color="#A77BFF"
          speed={0.0628}
          density={3400}
          sensitivity={0.1}
          className="pointer-events-none absolute right-12 top-1/2 h-[520px] w-[520px] -translate-y-1/2 opacity-70"
        />
        <div className="relative z-10 max-w-2xl space-y-6">
          <MotionReveal>
            <div className="text-[10px] uppercase tracking-[0.4em] text-muted">
              Experience
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Systems in Motion
            </h1>
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <p className="max-w-xl text-lg text-ink">
              Placeholder summary of roles, responsibilities, and impact.
            </p>
          </MotionReveal>
          <MotionReveal delay={0.2}>
            <p className="text-sm text-muted">Execution · Iteration · Delivery</p>
          </MotionReveal>
        </div>
      </section>

      <section className="mt-16 grid gap-6">
        <MotionReveal>
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
            Roles
          </h2>
        </MotionReveal>
        {["Role Placeholder", "Role Placeholder"].map((role, index) => (
          <MotionReveal key={role} delay={index * 0.05}>
            <div className="hud-border bg-black/40 p-5 text-sm text-muted">
              {role} — Placeholder experience content.
            </div>
          </MotionReveal>
        ))}
      </section>

      <ScrollSections title="Experience Signals" />
    </main>
  );
}
