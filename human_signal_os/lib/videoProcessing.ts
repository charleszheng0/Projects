/**
 * videoProcessing.ts — MediaPipe Face Mesh on uploaded video files.
 *
 * Processes a video file frame by frame at 5 fps using the MediaPipe FaceMesh
 * CDN library (same one loaded by FaceMeshCamera.tsx). Returns per-frame
 * vision breakdowns with timestamps, which feed the Deep Analysis report.
 */

import {
  computeVisionScores,
  type VisionBreakdown,
  type Pt,
} from "./visionScoring";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { FaceMesh: any }
}

export interface VideoFrame {
  time:         number;          // seconds from video start
  breakdown:    VisionBreakdown;
  confidence:   number;          // 0–100
  friendliness: number;          // 0–100
}

const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const el = document.createElement("script");
    el.src = src; el.crossOrigin = "anonymous";
    el.onload  = () => resolve();
    el.onerror = () => reject(new Error(`CDN load failed: ${src}`));
    document.head.appendChild(el);
  });
}

/**
 * Process a video file through MediaPipe FaceMesh at 5 fps.
 *
 * @param file         — the uploaded video file
 * @param onProgress   — callback with fraction 0–1 as frames are processed
 * @returns            — array of VideoFrame objects (one per sampled frame)
 */
export async function processVideoFrames(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<VideoFrame[]> {
  // 1. Ensure CDN scripts are loaded
  try {
    await loadScript(`${CDN}/drawing_utils/drawing_utils.js`);
    await loadScript(`${CDN}/face_mesh/face_mesh.js`);
  } catch (err) {
    console.warn("[videoProcessing] CDN load:", err);
  }

  if (!window.FaceMesh) {
    console.error("[videoProcessing] FaceMesh not available");
    return [];
  }

  // 2. Create hidden video element from file
  const url   = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src   = url;
  video.muted = true;
  video.playsInline = true;
  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => resolve();
  });

  const duration = video.duration;
  const FPS      = 5;
  const interval = 1 / FPS;
  const results: VideoFrame[] = [];

  // 3. Init a dedicated FaceMesh instance
  const fm = new window.FaceMesh({
    locateFile: (f: string) => `${CDN}/face_mesh/${f}`,
  });
  fm.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  // History buffers for rolling metrics
  const hist3s: Pt[][] = [];
  const hist5s: Pt[][] = [];

  await fm.initialize();

  // 4. Step through frames
  const times: number[] = [];
  for (let t = 0; t < duration; t += interval) times.push(t);

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    onProgress(i / times.length);

    // Seek to frame time
    video.currentTime = t;
    await new Promise<void>((res) => { video.onseeked = () => res(); });

    // Send video frame to FaceMesh, await result
    let face: Pt[] | null = null;
    fm.onResults((r: any) => {
      face = r.multiFaceLandmarks?.[0] ?? null;
    });
    try {
      await fm.send({ image: video });
    } catch {
      continue;
    }

    if (!face) continue;

    // Update rolling histories (~3s and ~5s at 5fps = 15 and 25 frames)
    hist3s.push(face);
    hist5s.push(face);
    if (hist3s.length > 15) hist3s.shift();
    if (hist5s.length > 25) hist5s.shift();

    const scores = computeVisionScores(face, hist3s, hist5s, null);
    results.push({
      time:         t,
      breakdown:    scores.breakdown,
      confidence:   scores.confidence,
      friendliness: scores.friendliness,
    });
  }

  onProgress(1);

  // Cleanup
  try { fm.close(); } catch {}
  URL.revokeObjectURL(url);

  return results;
}

/** Aggregate VideoFrame[] into a single average breakdown for the report card. */
export function averageVideoBreakdown(frames: VideoFrame[]): {
  avgBreakdown:    VisionBreakdown;
  avgConfidence:   number;
  avgFriendliness: number;
} {
  if (frames.length === 0) {
    const zero: VisionBreakdown = {
      gaze: 0.5, microExpr: 0.5, browTension: 0.5,
      lipCompression: 0.5, fidget: 0.5, headPosition: 0.5, duchenneSmile: 0.5,
    };
    return { avgBreakdown: zero, avgConfidence: 50, avgFriendliness: 50 };
  }

  const keys: Array<keyof VisionBreakdown> = [
    "gaze", "microExpr", "browTension", "lipCompression", "fidget", "headPosition", "duchenneSmile",
  ];

  const avgBreakdown = Object.fromEntries(
    keys.map(k => [k, frames.reduce((sum, f) => sum + f.breakdown[k], 0) / frames.length])
  ) as VisionBreakdown;

  const avgConfidence   = frames.reduce((s, f) => s + f.confidence,   0) / frames.length;
  const avgFriendliness = frames.reduce((s, f) => s + f.friendliness, 0) / frames.length;

  return { avgBreakdown, avgConfidence, avgFriendliness };
}
