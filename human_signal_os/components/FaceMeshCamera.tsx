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

export type OverlayMode = "contour" | "dots" | "skeleton" | "ghost" | "none";

export interface FaceMeshCameraProps {
  confidenceScore: number;
  overlayMode?: OverlayMode;
  onFaceLandmarks?: (landmarks: FaceLandmark[]) => void;
  onPoseLandmarks?: (landmarks: PoseLandmark[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const el = document.createElement("script");
    el.src = src;
    el.crossOrigin = "anonymous";
    el.onload  = () => resolve();
    el.onerror = () => reject(new Error(`CDN load failed: ${src}`));
    document.head.appendChild(el);
  });
}

// ── Ghost face contour paths (MediaPipe FaceMesh landmark sequences) ──────────

// Face oval — jawline + forehead loop
const FACE_OVAL: number[] = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10,
];

// Left eye contour
const LEFT_EYE: number[] = [
  33, 7, 163, 144, 145, 153, 154, 155, 133,
  173, 157, 158, 159, 160, 161, 246, 33,
];

// Right eye contour
const RIGHT_EYE: number[] = [
  263, 249, 390, 373, 374, 380, 381, 382, 362,
  398, 384, 385, 386, 387, 388, 466, 263,
];

// Lips outer + inner blend
const LIPS: number[] = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
  375, 321, 405, 314, 17, 84, 181, 91, 146, 61,
];

// Pose skeleton connections
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24],
  [23, 24],
  [23, 25], [25, 27],
  [24, 26], [26, 28],
];

// ── Confidence score → green (#00e676) to red (#ff1744) color ─────────────────
function lerpColor(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const r = Math.round(255 * c);
  const g = Math.round(230 * (1 - c) + 23 * c);
  const b = Math.round(118 * (1 - c) + 68 * c);
  return `rgba(${r},${g},${b},0.85)`;
}

// ── Draw a continuous path through an ordered sequence of landmark indices ────
function strokeContour(
  ctx: CanvasRenderingContext2D,
  seq: number[],
  lm: FaceLandmark[],
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  if (seq.length < 2) return;
  ctx.beginPath();
  const first = lm[seq[0]];
  if (!first) return;
  ctx.moveTo(dx + first.x * dw, dy + first.y * dh);
  for (let i = 1; i < seq.length; i++) {
    const pt = lm[seq[i]];
    if (pt) ctx.lineTo(dx + pt.x * dw, dy + pt.y * dh);
  }
  ctx.stroke();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FaceMeshCamera({
  confidenceScore,
  overlayMode = "contour",
  onFaceLandmarks,
  onPoseLandmarks,
}: FaceMeshCameraProps) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const confidenceRef = useRef(confidenceScore);
  const overlayRef    = useRef<OverlayMode>(overlayMode);
  const onFaceRef     = useRef(onFaceLandmarks);
  const onPoseRef     = useRef(onPoseLandmarks);

  useEffect(() => { confidenceRef.current = confidenceScore; }, [confidenceScore]);
  useEffect(() => { overlayRef.current    = overlayMode; },     [overlayMode]);
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
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
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
        try { await fm.initialize(); } catch (err) {
          console.error("[FaceMeshCamera] FaceMesh.initialize() failed:", err);
        }
        if (stopped) return;
        faceMeshRef.current = fm;
      }

      // ── 4. Init Pose ──────────────────────────────────────────────────────
      let latestPose: PoseLandmark[] | undefined;
      let poseBusy = false;

      if (window.Pose) {
        const pose = new window.Pose({
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
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
        try { await pose.initialize(); } catch (err) {
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

        // Cover-fit: scale video to fill canvas while preserving aspect ratio
        const vw = video!.videoWidth  || 1280;
        const vh = video!.videoHeight || 720;
        const scale = Math.max(w / vw, h / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const dx = (w - dw) / 2;
        const dy = (h - dh) / 2;

        // Video frame — CSS scaleX(-1) mirrors for front-camera feel
        ctx!.drawImage(video!, dx, dy, dw, dh);

        const mode = overlayRef.current;

        // "skeleton" or "contour" — draw pose bones
        if ((mode === "skeleton" || mode === "contour") && latestPose?.length) {
          ctx!.strokeStyle = "rgba(255,255,255,0.08)";
          ctx!.lineWidth   = 0.8;
          ctx!.lineCap     = "round";
          for (const [ai, bi] of POSE_CONNECTIONS) {
            const a = latestPose[ai], b = latestPose[bi];
            if (!a || !b) continue;
            if ((a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5) continue;
            ctx!.beginPath();
            ctx!.moveTo(dx + a.x * dw, dy + a.y * dh);
            ctx!.lineTo(dx + b.x * dw, dy + b.y * dh);
            ctx!.stroke();
          }
        }

        // "contour" — ghost face outline (default premium look)
        if (mode === "contour" && latestFace?.length) {
          ctx!.strokeStyle = "rgba(255,255,255,0.15)";
          ctx!.lineWidth   = 0.8;
          ctx!.lineCap     = "round";
          ctx!.lineJoin    = "round";
          strokeContour(ctx!, FACE_OVAL, latestFace, dx, dy, dw, dh);
          strokeContour(ctx!, LEFT_EYE,  latestFace, dx, dy, dw, dh);
          strokeContour(ctx!, RIGHT_EYE, latestFace, dx, dy, dw, dh);
          strokeContour(ctx!, LIPS,      latestFace, dx, dy, dw, dh);
        }

        // "dots" — full 468-point landmark dot cloud, colored by confidence score
        if (mode === "dots" && latestFace?.length) {
          ctx!.fillStyle = lerpColor(confidenceRef.current);
          for (const lm of latestFace) {
            ctx!.beginPath();
            ctx!.arc(dx + lm.x * dw, dy + lm.y * dh, 1.2, 0, 2 * Math.PI);
            ctx!.fill();
          }
          // Also show pose dots when in dots mode
          if (latestPose?.length) {
            ctx!.fillStyle = "rgba(255,255,255,0.35)";
            for (const lm of latestPose) {
              if ((lm.visibility ?? 1) < 0.5) continue;
              ctx!.beginPath();
              ctx!.arc(dx + lm.x * dw, dy + lm.y * dh, 2.5, 0, 2 * Math.PI);
              ctx!.fill();
            }
            ctx!.strokeStyle = "rgba(255,255,255,0.18)";
            ctx!.lineWidth   = 1;
            for (const [ai, bi] of POSE_CONNECTIONS) {
              const a = latestPose[ai], b = latestPose[bi];
              if (!a || !b) continue;
              if ((a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5) continue;
              ctx!.beginPath();
              ctx!.moveTo(dx + a.x * dw, dy + a.y * dh);
              ctx!.lineTo(dx + b.x * dw, dy + b.y * dh);
              ctx!.stroke();
            }
          }
        }

        // "skeleton" — pose bones only, no face overlay
        if (mode === "skeleton" && latestPose?.length) {
          ctx!.fillStyle = "rgba(255,255,255,0.25)";
          for (const lm of latestPose) {
            if ((lm.visibility ?? 1) < 0.5) continue;
            ctx!.beginPath();
            ctx!.arc(dx + lm.x * dw, dy + lm.y * dh, 2.5, 0, 2 * Math.PI);
            ctx!.fill();
          }
        }

        // "ghost" — ultra-faint face outline at 15% opacity for Visual mode (no dots, no pose)
        if (mode === "ghost" && latestFace?.length) {
          ctx!.globalAlpha = 0.15;
          ctx!.strokeStyle = "rgba(255,255,255,1)";
          ctx!.lineWidth   = 0.9;
          ctx!.lineCap     = "round";
          ctx!.lineJoin    = "round";
          strokeContour(ctx!, FACE_OVAL, latestFace, dx, dy, dw, dh);
          strokeContour(ctx!, LEFT_EYE,  latestFace, dx, dy, dw, dh);
          strokeContour(ctx!, RIGHT_EYE, latestFace, dx, dy, dw, dh);
          strokeContour(ctx!, LIPS,      latestFace, dx, dy, dw, dh);
          ctx!.globalAlpha = 1;
        }

        // "none" — plain camera, nothing drawn over video

        // Feed FaceMesh (throttled)
        if (faceMeshRef.current && !fmBusy) {
          fmBusy = true;
          try {
            faceMeshRef.current.send({ image: video })
              .catch(() => { fmBusy = false; });
          } catch { fmBusy = false; }
        }
        // Feed Pose (independent throttle)
        if (poseRef.current && !poseBusy) {
          poseBusy = true;
          try {
            poseRef.current.send({ image: video })
              .catch(() => { poseBusy = false; });
          } catch { poseBusy = false; }
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
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#000000" }}>
      {/* Hidden video — must be in DOM for frame decoding */}
      <video
        ref={videoRef}
        style={{ position: "absolute", width: 1, height: 1, top: 0, left: 0, opacity: 0, pointerEvents: "none" }}
        playsInline
        muted
      />
      {/* Canvas — CSS mirror for front-camera view */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "scaleX(-1)" }}
      />
    </div>
  );
}
