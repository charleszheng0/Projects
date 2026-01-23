"use client";

import { useEffect, useRef } from "react";

export function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = {
      width: 0,
      height: 0,
      particles: [] as {
        x: number;
        y: number;
        baseX: number;
        baseY: number;
        vx: number;
        vy: number;
        z: number;
        phase: number;
      }[],
      pointer: { x: 0, y: 0, active: false },
    };

    const config = {
      count: 520,
      dotRadius: 1.1,
      lineDistance: 160,
      pointerRadius: 200,
      repelStrength: 0.9,
      driftScale: 22,
      driftSpeed: 0.00025,
      inertia: 0.92,
      parallax: 16,
      returnStrength: 0.05,
    };

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    const resize = (reducedMotion = false) => {
      const count = reducedMotion ? 220 : config.count;
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      canvas.width = state.width * window.devicePixelRatio;
      canvas.height = state.height * window.devicePixelRatio;
      canvas.style.width = `${state.width}px`;
      canvas.style.height = `${state.height}px`;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      state.particles = Array.from({ length: count }).map(() => {
        const x = rand(0, state.width);
        const y = rand(0, state.height);
        return {
          x,
          y,
          baseX: x,
          baseY: y,
          vx: 0,
          vy: 0,
          z: rand(0.4, 1.4),
          phase: rand(0, Math.PI * 2),
        };
      });
    };

    const update = () => {
      const t = performance.now();
      ctx.clearRect(0, 0, state.width, state.height);

      const pointerInfluence = state.pointer.active ? 1 : 0;
      const parallaxX = state.pointer.active
        ? (state.pointer.x / state.width - 0.5) * config.parallax
        : 0;
      const parallaxY = state.pointer.active
        ? (state.pointer.y / state.height - 0.5) * config.parallax
        : 0;

      const cellSize = config.lineDistance;
      const grid = new Map<string, number[]>();

      for (let i = 0; i < state.particles.length; i += 1) {
        const particle = state.particles[i];
        const driftX =
          Math.sin(t * config.driftSpeed + particle.z * 3.1 + particle.phase) *
          config.driftScale *
          (particle.z * 0.5);
        const driftY =
          Math.cos(t * config.driftSpeed + particle.z * 2.2 + particle.phase) *
          config.driftScale *
          (particle.z * 0.5);

        let nextX = particle.baseX + driftX + particle.vx;
        let nextY = particle.baseY + driftY + particle.vy;

        const returnX = (particle.baseX - nextX) * config.returnStrength;
        const returnY = (particle.baseY - nextY) * config.returnStrength;
        particle.vx += returnX;
        particle.vy += returnY;

        if (state.pointer.active) {
          const dx = nextX - state.pointer.x;
          const dy = nextY - state.pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < config.pointerRadius && dist > 0.1) {
            const force = (config.pointerRadius - dist) / config.pointerRadius;
            const push = force * config.repelStrength * pointerInfluence;
            particle.vx += (dx / dist) * push;
            particle.vy += (dy / dist) * push;
          }
        }

        const springX = (particle.baseX + driftX - nextX) * config.returnStrength;
        const springY = (particle.baseY + driftY - nextY) * config.returnStrength;
        particle.vx += springX;
        particle.vy += springY;

        particle.vx *= config.inertia;
        particle.vy *= config.inertia;

        nextX += particle.vx;
        nextY += particle.vy;

        particle.x = nextX;
        particle.y = nextY;

        const cellX = Math.floor(particle.x / cellSize);
        const cellY = Math.floor(particle.y / cellSize);
        const key = `${cellX},${cellY}`;
        const bucket = grid.get(key) ?? [];
        bucket.push(i);
        grid.set(key, bucket);
      }

      ctx.strokeStyle = "rgba(160, 130, 255, 0.22)";
      ctx.lineWidth = 0.7;
      for (let i = 0; i < state.particles.length; i += 1) {
        const p1 = state.particles[i];
        const baseCellX = Math.floor(p1.x / cellSize);
        const baseCellY = Math.floor(p1.y / cellSize);
        for (let gx = -1; gx <= 1; gx += 1) {
          for (let gy = -1; gy <= 1; gy += 1) {
            const key = `${baseCellX + gx},${baseCellY + gy}`;
            const neighbors = grid.get(key);
            if (!neighbors) continue;
            for (const j of neighbors) {
              if (j <= i) continue;
              const p2 = state.particles[j];
              const dx = p1.x - p2.x;
              const dy = p1.y - p2.y;
              const dist = Math.hypot(dx, dy);
              if (dist < config.lineDistance) {
                const alpha = 1 - dist / config.lineDistance;
                const nearPointer =
                  state.pointer.active &&
                  Math.hypot(p1.x - state.pointer.x, p1.y - state.pointer.y) <
                    config.pointerRadius;
                ctx.globalAlpha = alpha * (nearPointer ? 0.9 : 0.65);
                ctx.beginPath();
                ctx.moveTo(p1.x + parallaxX, p1.y + parallaxY);
                ctx.lineTo(p2.x + parallaxX, p2.y + parallaxY);
                ctx.stroke();
              }
            }
          }
        }
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(180, 140, 255, 0.6)";
      ctx.shadowColor = "rgba(180, 140, 255, 0.4)";
      ctx.shadowBlur = 8;
      for (const particle of state.particles) {
        ctx.beginPath();
        ctx.arc(
          particle.x + parallaxX,
          particle.y + parallaxY,
          config.dotRadius * (0.8 + particle.z * 0.4),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      requestAnimationFrame(update);
    };

    const handlePointer = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.pointer.x = event.clientX - rect.left;
      state.pointer.y = event.clientY - rect.top;
      state.pointer.active = true;
    };

    const clearPointer = () => {
      state.pointer.active = false;
    };

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => resize(media.matches);

    applyMotion();
    update();

    window.addEventListener("resize", applyMotion);
    window.addEventListener("mousemove", handlePointer);
    window.addEventListener("mouseleave", clearPointer);
    media.addEventListener("change", applyMotion);

    return () => {
      window.removeEventListener("resize", applyMotion);
      window.removeEventListener("mousemove", handlePointer);
      window.removeEventListener("mouseleave", clearPointer);
      media.removeEventListener("change", applyMotion);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
