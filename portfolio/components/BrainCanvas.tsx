"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { AdditiveBlending } from "three";
import { useEffect, useMemo, useRef, useState, memo } from "react";

type BrainCanvasProps = {
  color?: string;
  speed?: number;
  density?: number;
  sensitivity?: number;
  className?: string;
};

const BrainPoints = memo(function BrainPoints({
  color = "#7CFFCB",
  speed = 0.0015,
  density = 3800,
  sensitivity = 0.15,
}: BrainCanvasProps) {
  const ref = useRef<any>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const handleChange = () => setReducedMotion(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const { surfacePoints, corePoints } = useMemo(() => {
    const count = reducedMotion ? Math.floor(density * 0.6) : density;
    const surface = new Float32Array(density * 3);
    const core = new Float32Array(Math.floor(density * 0.65) * 3);
    const surfaceCount = count;
    const coreCount = Math.floor(count * 0.65);

    const shellNoise = () => (Math.random() - 0.5) * 0.12;
    const coreNoise = () => (Math.random() - 0.5) * 0.2;

    const shape = (theta: number, phi: number, rScale: number) => {
      const base = 1.1 + Math.random() * 0.2;
      const x = base * Math.sin(phi) * Math.cos(theta) * 1.25;
      const y = base * Math.sin(phi) * Math.sin(theta) * 0.9;
      const z = base * Math.cos(phi) * 0.95;
      const bulge = 0.12 * Math.sin(phi * 2.4) + 0.08 * Math.cos(theta * 1.6);
      return {
        x: (x + bulge) * rScale,
        y: (y + bulge * 0.6) * rScale,
        z: (z + bulge * 0.4) * rScale,
      };
    };

    for (let i = 0; i < surfaceCount; i += 1) {
      const r = 1.05 + Math.random() * 0.25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const { x, y, z } = shape(theta, phi, r);
      const noise = shellNoise();
      surface[i * 3] = x + noise;
      surface[i * 3 + 1] = y + noise;
      surface[i * 3 + 2] = z + noise;
    }

    for (let i = 0; i < coreCount; i += 1) {
      const r = 0.6 + Math.random() * 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const { x, y, z } = shape(theta, phi, r);
      const noise = coreNoise();
      core[i * 3] = x + noise;
      core[i * 3 + 1] = y + noise;
      core[i * 3 + 2] = z + noise;
    }

    return { surfacePoints: surface, corePoints: core };
  }, [density, reducedMotion]);

  const effectiveSpeed = useMemo(() => reducedMotion ? speed * 0.4 : speed, [reducedMotion, speed]);
  const effectiveSensitivity = useMemo(() => reducedMotion ? sensitivity * 0.5 : sensitivity, [reducedMotion, sensitivity]);

  useFrame(({ clock, mouse }, delta) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y += effectiveSpeed * delta;
    ref.current.rotation.x = mouse.y * effectiveSensitivity;
    if (mouse.x !== 0) {
      ref.current.rotation.y += Math.sign(mouse.x) * effectiveSensitivity * 0.06;
    }
    const pulse = 1 + Math.sin(t * 1.2) * (reducedMotion ? 0.01 : 0.02);
    ref.current.scale.setScalar(pulse);
  });

  return (
    <group ref={ref}>
      <Points positions={surfacePoints} stride={3}>
        <PointMaterial
          color={color}
          size={0.018}
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </Points>
      <Points positions={corePoints} stride={3}>
        <PointMaterial
          color={color}
          size={0.012}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </Points>
    </group>
  );
});

BrainPoints.displayName = "BrainPoints";

export const BrainCanvas = memo(function BrainCanvas({ className, ...props }: BrainCanvasProps) {
  return (
    <div className={`relative h-[320px] w-full ${className ?? ""}`}>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={1.2} />
        <BrainPoints {...props} />
      </Canvas>
    </div>
  );
});
