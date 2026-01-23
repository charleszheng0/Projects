"use client";

import { MotionReveal } from "./MotionReveal";

type ScrollSectionsProps = {
  title?: string;
};

const items = Array.from({ length: 6 }, (_, index) => ({
  id: `panel-${index}`,
  title: `Placeholder Section ${index + 1}`,
  body: "Placeholder content for scroll depth and layout balance.",
}));

export function ScrollSections({
  title = "Additional Signals",
  count = 6,
}: ScrollSectionsProps & { count?: number }) {
  return (
    <section className="mt-16 grid gap-6">
      <MotionReveal>
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
          {title}
        </h2>
      </MotionReveal>
      <div className="grid gap-4 md:grid-cols-2">
        {items.slice(0, count).map((item, index) => (
          <MotionReveal key={item.id} delay={index * 0.05}>
            <div className="hud-border bg-black/40 p-5 text-sm text-muted">
              <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-ink">
                {item.title}
              </div>
              <p>{item.body}</p>
            </div>
          </MotionReveal>
        ))}
      </div>
    </section>
  );
}
