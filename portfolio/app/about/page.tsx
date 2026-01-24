import { BrainCanvas } from "../../components/BrainCanvas";
import { MotionReveal } from "../../components/MotionReveal";
import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="min-h-screen px-6 pb-20 pt-28 md:px-16">
      <section className="relative flex min-h-[60vh] items-center justify-center">
        <BrainCanvas
          color="#7C4DFF"
          speed={0.0628}
          density={3600}
          sensitivity={0.12}
          className="pointer-events-none absolute right-12 top-1/2 h-[520px] w-[520px] -translate-y-1/2 opacity-70"
        />
        <div className="absolute left-6 md:left-16 top-1/2 -translate-y-1/2 z-20 flex items-center gap-12">
          <MotionReveal delay={0.05}>
            <div className="relative w-[180px] h-[180px] md:w-[240px] md:h-[240px] flex-shrink-0">
              <Image
                src="/profile.jpg"
                alt="Charles Zheng"
                fill
                className="rounded-full object-cover"
                sizes="(max-width: 768px) 180px, 240px"
              />
            </div>
          </MotionReveal>
          <MotionReveal>
            <h1 className="text-5xl font-semibold tracking-tight md:text-7xl whitespace-nowrap">
              More about me
            </h1>
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
          <div className="bg-black/40 p-5 text-base text-muted space-y-2">
            <div className="font-semibold text-ink">Duke University</div>
            <div>ECE/CS Student · Durham, NC</div>
            <div className="text-sm text-muted mt-2">First year student focused on building and deploying systems at the intersection of hardware and software.</div>
          </div>
        </MotionReveal>
      </section>

      <section className="mt-16 grid gap-6">
        <MotionReveal>
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
            Interests
          </h2>
        </MotionReveal>
        <MotionReveal delay={0.1}>
          <div className="bg-black/40 p-5 text-base text-muted space-y-3">
            <p>
              I love everything about food—nutrition, cooking, and eating. Food is both a passion and a lens through which I explore culture, science, and human connection.
            </p>
            <p>
              I'm really into human behaviors combined with the upcoming tech of machine learning and AI, and getting to learn about how society functions. The intersection of technology and human psychology fascinates me.
            </p>
            <p>
              I'm also interested in linguistics and communication, and I want to be good at it. Understanding how we express ideas and connect with others is something I'm continuously working to improve.
            </p>
          </div>
        </MotionReveal>
      </section>
    </main>
  );
}
