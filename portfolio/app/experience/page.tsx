import { BrainCanvas } from "../../components/BrainCanvas";
import { MotionReveal } from "../../components/MotionReveal";

export default function ExperiencePage() {
  return (
    <main className="min-h-screen px-6 pb-20 pt-28 md:px-16">
      <section className="relative flex min-h-[60vh] items-center justify-center">
        <BrainCanvas
          color="#7C4DFF"
          speed={0.0628}
          density={3400}
          sensitivity={0.1}
          className="pointer-events-none absolute right-12 top-1/2 h-[520px] w-[520px] -translate-y-1/2 opacity-70"
        />
        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
          <MotionReveal>
            <div className="text-base md:text-lg uppercase tracking-[0.4em] text-muted inline-block">
              Experience
            </div>
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <p className="max-w-xl mx-auto text-base md:text-lg text-ink">
              Roles in research, industry, and entrepreneurship
            </p>
          </MotionReveal>
        </div>
      </section>

      <section className="mt-16 grid gap-6">
        <MotionReveal delay={0.05}>
          <div className="bg-black/40 p-5 text-base text-muted space-y-2">
            <div className="font-semibold text-ink">Duke University - Cyber Physical Lab</div>
            <div className="text-sm">Undergraduate Researcher · Durham, NC · Nov 2025 - Present</div>
            <ul className="text-sm space-y-1 mt-2 list-disc list-inside">
              <li>Evaluated 4+ peer-reviewed research datasets on machine learning-based inertial odometry models</li>
              <li>Conducted quantitative analysis on 200,000+ datapoints in 100+ trials utilizing Python & ROS2</li>
              <li>Designed standardized analytical frameworks with varied IMUs on Pixhawk drones</li>
            </ul>
          </div>
        </MotionReveal>
        <MotionReveal delay={0.1}>
          <div className="bg-black/40 p-5 text-base text-muted space-y-2">
            <div className="font-semibold text-ink">UNC Physical Science Lab</div>
            <div className="text-sm">Student Research Assistant · Chapel Hill, NC · Jun 2023 - Aug 2023</div>
            <ul className="text-sm space-y-1 mt-2 list-disc list-inside">
              <li>Engineered and iterated printed circuit boards in biomedical instrumentation study</li>
              <li>Performed data acquisition and bandpass-filter analysis across 30 participants</li>
              <li>Reduced noise levels by 60% and improved data clarity</li>
            </ul>
          </div>
        </MotionReveal>
        <MotionReveal delay={0.15}>
          <div className="bg-black/40 p-5 text-base text-muted space-y-2">
            <div className="font-semibold text-ink">Triangle Ecycle</div>
            <div className="text-sm">Sales Associate & Intern · Durham, NC · Jun 2024 - Sep 2024</div>
            <ul className="text-sm space-y-1 mt-2 list-disc list-inside">
              <li>Optimized inventory management of reusable hardware components</li>
              <li>Refurbished 100+ computers equating to $20k+ in revenue</li>
              <li>Offered clients 50-80% savings below retail value</li>
            </ul>
          </div>
        </MotionReveal>
        <MotionReveal delay={0.2}>
          <div className="bg-black/40 p-5 text-base text-muted space-y-2">
            <div className="font-semibold text-ink">CZScapes</div>
            <div className="text-sm">Founder & CEO · Durham, NC · May 2025 - Sep 2025</div>
            <ul className="text-sm space-y-1 mt-2 list-disc list-inside">
              <li>Founded and scaled an independent landscaping business</li>
              <li>Achieved +70% client-base growth via strategic marketing</li>
              <li>Tracked $2k+ revenue while applying market-based price optimization</li>
            </ul>
          </div>
        </MotionReveal>
        <MotionReveal delay={0.25}>
          <div className="bg-black/40 p-5 text-base text-muted space-y-2">
            <div className="font-semibold text-ink">China Wok</div>
            <div className="text-sm">Restaurant Management · Chapel Hill, NC · Feb 2019 - Aug 2025</div>
            <ul className="text-sm space-y-1 mt-2 list-disc list-inside">
              <li>Drove +15% increase in sales volume through optimizing delivery-platform performance</li>
              <li>Managed cross-functional 6+ member team while coordinating customer service</li>
            </ul>
          </div>
        </MotionReveal>
      </section>
    </main>
  );
}
