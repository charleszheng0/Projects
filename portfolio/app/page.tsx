import { BrainCanvas } from "../components/BrainCanvas";
import { MotionReveal } from "../components/MotionReveal";
import { NameReveal } from "../components/NameReveal";

export default function HomePage() {
  return (
    <main className="h-screen px-6 pb-20 pt-28 md:px-16">
      <section className="relative flex h-full items-center justify-start">
        <BrainCanvas
          color="#7C4DFF"
          speed={0.0628}
          density={5200}
          sensitivity={0.12}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[min(70vw,520px)] w-[min(70vw,520px)] -translate-x-1/2 -translate-y-1/2 opacity-80"
        />
        <div className="absolute left-0 z-10 pl-8 space-y-6 text-left">
          <MotionReveal>
            <div className="text-[10px] uppercase tracking-[0.4em] text-muted">
              Hey, I'm
            </div>
            <NameReveal />
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <p className="max-w-xl text-lg text-ink">
              Welcome to my portfolio! I'm an ECE/CS student @ Duke.<br />I work on stuff, and you'll see some of it here.
            </p>
          </MotionReveal>
          <MotionReveal delay={0.2}>
            <p className="font-mono text-sm tracking-[0.3em] text-accent">
              building w/ change
            </p>
          </MotionReveal>
        </div>
      </section>
    </main>
  );
}
