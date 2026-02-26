"use client";

import { useEffect, useRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    FaceMesh: any;
    Pose: any;
  }
}

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface FaceMeshCameraProps {
  confidenceScore: number; // 0–1  → dot color green (1) to red (0)
  onFaceLandmarks?: (landmarks: FaceLandmark[]) => void;
  onPoseLandmarks?: (landmarks: PoseLandmark[]) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreToRgb(score: number): string {
  const s = Math.max(0, Math.min(1, score));
  return `rgb(${Math.round(255 * (1 - s))},${Math.round(255 * s)},0)`;
}

/**
 * Inject a <script> tag and resolve only after it fires `load`.
 * Idempotent — if the same src is already in the DOM, resolves immediately.
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.crossOrigin = "anonymous";
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`CDN load failed: ${src}`));
    document.head.appendChild(el);
  });
}

const POSE_CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24],
  [23, 24],
  [23, 25], [25, 27],
  [24, 26], [26, 28],
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function FaceMeshCamera({
  confidenceScore,
  onFaceLandmarks,
  onPoseLandmarks,
}: FaceMeshCameraProps) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const confidenceRef = useRef(confidenceScore);
  // Smoothed display score — EMA toward confidenceRef so color transitions are fluid
  const displayScoreRef = useRef(confidenceScore);
  const onFaceRef     = useRef(onFaceLandmarks);
  const onPoseRef     = useRef(onPoseLandmarks);

  useEffect(() => { confidenceRef.current = confidenceScore; }, [confidenceScore]);
  useEffect(() => { onFaceRef.current = onFaceLandmarks; },    [onFaceLandmarks]);
  useEffect(() => { onPoseRef.current = onPoseLandmarks; },    [onPoseLandmarks]);

  const streamRef   = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const poseRef     = useRef<any>(null);
  const rafRef      = useRef<number>(0);

  useEffect(() => {
    let stopped = false;

    async function start() {
      // ── 1. Webcam ─────────────────────────────────────────────────────────
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });
      } catch (err) {
        console.error("[FaceMeshCamera] getUserMedia failed:", err);
        return;
      }
      if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      streamRef.current = stream;
      try { await video.play(); } catch { /* readyState check handles this */ }

      // ── 2. Load CDN scripts ───────────────────────────────────────────────
      // drawing_utils first, then face_mesh + pose in parallel.
      const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe";
      try {
        await loadScript(`${CDN}/drawing_utils/drawing_utils.js`);
        await Promise.all([
          loadScript(`${CDN}/face_mesh/face_mesh.js`),
          loadScript(`${CDN}/pose/pose.js`),
        ]);
      } catch (err) {
        console.warn("[FaceMeshCamera] CDN partial load:", err);
      }
      if (stopped) return;

      // ── 3. Init FaceMesh ──────────────────────────────────────────────────
      let latestFace: FaceLandmark[] | undefined;
      let fmBusy = false;

      if (window.FaceMesh) {
        const fm = new window.FaceMesh({
          locateFile: (f: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
        });
        fm.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        fm.onResults((r: any) => {
          fmBusy = false;
          latestFace = r.multiFaceLandmarks?.[0] ?? undefined;
          if (latestFace) onFaceRef.current?.(latestFace);
        });

        // KEY FIX: call initialize() to eagerly download all WASM binary assets
        // before the first send(). Without this the emscripten Module object is
        // not set up yet when the lazy-load triggers, causing:
        //   "Cannot read properties of undefined (reading 'https://...assets.data')"
        try {
          await fm.initialize();
        } catch (err) {
          console.error("[FaceMeshCamera] FaceMesh.initialize() failed:", err);
        }
        if (stopped) return;
        faceMeshRef.current = fm;
      }

      // ── 4. Init Pose ──────────────────────────────────────────────────────
      // Sequential (not parallel) — avoids WASM memory contention between
      // two large emscripten modules initialising simultaneously.
      let latestPose: PoseLandmark[] | undefined;
      let poseBusy = false;

      if (window.Pose) {
        const pose = new window.Pose({
          locateFile: (f: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
        });
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        pose.onResults((r: any) => {
          poseBusy = false;
          latestPose = r.poseLandmarks ?? undefined;
          if (latestPose) onPoseRef.current?.(latestPose);
        });

        // Same fix as FaceMesh — pre-warm before first send()
        try {
          await pose.initialize();
        } catch (err) {
          console.error("[FaceMeshCamera] Pose.initialize() failed:", err);
        }
        if (stopped) return;
        poseRef.current = pose;
      }

      // ── 5. Render loop ────────────────────────────────────────────────────
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      function tick() {
        if (stopped) return;
        rafRef.current = requestAnimationFrame(tick);
        if (!video || video.readyState < 2) return;

        const w = canvas!.clientWidth;
        const h = canvas!.clientHeight;
        if (!w || !h) return;
        if (canvas!.width  !== w) canvas!.width  = w;
        if (canvas!.height !== h) canvas!.height = h;

        // Video frame — un-mirrored; CSS scaleX(-1) on the element handles flip.
        // Both pixels and landmark coords flip together → always aligned.
        ctx!.drawImage(video!, 0, 0, w, h);

        // Pose skeleton
        if (latestPose?.length) {
          ctx!.strokeStyle = "rgba(255,255,255,0.22)";
          ctx!.lineWidth   = 1.5;
          for (const [ai, bi] of POSE_CONNECTIONS) {
            const a = latestPose[ai], b = latestPose[bi];
            if (!a || !b) continue;
            if ((a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5) continue;
            ctx!.beginPath();
            ctx!.moveTo(a.x * w, a.y * h);
            ctx!.lineTo(b.x * w, b.y * h);
            ctx!.stroke();
          }
          ctx!.fillStyle = "rgba(255,255,255,0.60)";
          for (const lm of latestPose) {
            if ((lm.visibility ?? 1) < 0.5) continue;
            ctx!.beginPath();
            ctx!.arc(lm.x * w, lm.y * h, 3.5, 0, 2 * Math.PI);
            ctx!.fill();
          }
        }

        // Face mesh dots — color driven by confidenceScore prop (EMA-smoothed)
        displayScoreRef.current =
          displayScoreRef.current * 0.88 + confidenceRef.current * 0.12;
        if (latestFace?.length) {
          ctx!.fillStyle = scoreToRgb(displayScoreRef.current);
          for (const lm of latestFace) {
            ctx!.beginPath();
            ctx!.arc(lm.x * w, lm.y * h, 1.4, 0, 2 * Math.PI);
            ctx!.fill();
          }
        }

        // Feed FaceMesh (throttled — skip frame if previous still processing)
        if (faceMeshRef.current && !fmBusy) {
          fmBusy = true;
          faceMeshRef.current.send({ image: video })
            .catch(() => { fmBusy = false; });
        }
        // Feed Pose (independent throttle)
        if (poseRef.current && !poseBusy) {
          poseBusy = true;
          poseRef.current.send({ image: video })
            .catch(() => { poseBusy = false; });
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
      try { faceMeshRef.current?.close(); } catch {}
      try { poseRef.current?.close();     } catch {}
      faceMeshRef.current = null;
      poseRef.current     = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full" style={{ background: "#050709" }}>
      {/* Hidden video — MUST be in DOM for browser to decode frames */}
      <video
        ref={videoRef}
        className="absolute opacity-0 pointer-events-none"
        style={{ width: 1, height: 1, top: 0, left: 0 }}
        playsInline
        muted
      />
      {/* Canvas — CSS mirror so user sees front-camera view */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ transform: "scaleX(-1)" }}
      />
      {/* LIVE badge */}
      <div
        className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono z-10"
        style={{ background: "rgba(8,10,15,0.85)", border: "1px solid var(--border-subtle)", backdropFilter: "blur(4px)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: "var(--green)" }} />
        <span style={{ color: "var(--text-secondary)" }}>LIVE</span>
      </div>
    </div>
  );
}
