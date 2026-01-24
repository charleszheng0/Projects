import { BrainCanvas } from "../../components/BrainCanvas";
import { MotionReveal } from "../../components/MotionReveal";

export default function OtherPage() {
  return (
    <main className="min-h-screen px-6 pb-20 pt-28 md:px-16">
      <section className="relative flex min-h-[60vh] items-center justify-center">
        <BrainCanvas
          color="#7C4DFF"
          speed={0.0628}
          density={3200}
          sensitivity={0.08}
          className="pointer-events-none absolute right-12 top-1/2 h-[520px] w-[520px] -translate-y-1/2 opacity-70"
        />
        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
          <MotionReveal>
            <div className="text-base md:text-lg uppercase tracking-[0.4em] text-muted">
              Other
            </div>
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <p className="max-w-xl mx-auto text-base md:text-lg text-ink">
              Technical skills, tools, and capabilities across software, hardware, and data analysis.
            </p>
          </MotionReveal>
        </div>
      </section>

      <section className="mt-16 space-y-6">
        <MotionReveal delay={0.1}>
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted mb-4">
            Technical
          </h2>
          <div className="bg-black/40 p-5 text-base text-muted">
            Python (certified), Java (certified), SQL, CAD, PCB Design
          </div>
        </MotionReveal>
        <MotionReveal delay={0.15}>
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted mb-4">
            Data & Analytics
          </h2>
          <div className="bg-black/40 p-5 text-base text-muted">
            Excel, Tableau, Classification & Regression, Pandas
          </div>
        </MotionReveal>
        <MotionReveal delay={0.2}>
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted mb-4">
            Product & Execution
          </h2>
          <div className="bg-black/40 p-5 text-base text-muted">
            Performance Metrics, Client Communication, MVP Testing, User Feedback Loops
          </div>
        </MotionReveal>
        <MotionReveal delay={0.25}>
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted mb-4">
            Languages
          </h2>
          <div className="bg-black/40 p-5 text-base text-muted">
            English, Mandarin, Spanish
          </div>
        </MotionReveal>
      </section>
    </main>
  );
}
