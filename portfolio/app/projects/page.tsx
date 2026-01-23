import { BrainCanvas } from "../../components/BrainCanvas";
import { MotionReveal } from "../../components/MotionReveal";
import { ScrollSections } from "../../components/ScrollSections";

const projectLinks = [
  { label: "Intelligence", href: "/projects/intelligence" },
  { label: "Systems", href: "/projects/systems" },
  { label: "Research", href: "/projects/research" },
  { label: "Experiments", href: "/projects/experiments" },
];

export default function ProjectsPage() {
  return (
    <main className="px-6 pb-20 pt-28 md:px-16">
      <section className="relative flex min-h-[60vh] items-center justify-center">
        <BrainCanvas
          color="#A77BFF"
          speed={0.0628}
          density={4000}
          sensitivity={0.14}
          className="pointer-events-none absolute right-12 top-1/2 h-[520px] w-[520px] -translate-y-1/2 opacity-70"
        />
        <div className="relative z-10 max-w-2xl space-y-6">
          <MotionReveal>
            <div className="text-[10px] uppercase tracking-[0.4em] text-muted">
              Projects
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Active Intelligence
            </h1>
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <p className="max-w-xl text-lg text-ink">
              Placeholder snapshot of builds, experiments, and deployed systems.
            </p>
          </MotionReveal>
          <MotionReveal delay={0.2}>
            <p className="text-sm text-muted">Live builds · Research threads</p>
          </MotionReveal>
        </div>
      </section>

      <section className="mt-16 grid gap-6">
        <MotionReveal>
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
            Project Streams
          </h2>
        </MotionReveal>
        <div className="grid gap-4 md:grid-cols-2">
          {projectLinks.map((item) => (
            <MotionReveal key={item.href}>
              <a
                href={item.href}
                className="hud-border block bg-black/40 px-4 py-5 text-xs uppercase tracking-[0.3em] text-ink transition-opacity hover:opacity-80"
              >
                {item.label}
              </a>
            </MotionReveal>
          ))}
        </div>
      </section>

      <ScrollSections title="Project Signals" />
    </main>
  );
}
