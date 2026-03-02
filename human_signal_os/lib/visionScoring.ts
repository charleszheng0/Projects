/**
 * Vision Module — 7-metric composite scoring via MediaPipe Face Mesh (478 landmarks).
 *
 * Metrics:
 *  1. Gaze direction & eye contact consistency   (iris landmarks 468/473)
 *  2. Micro-expression velocity & return-to-neutral speed
 *  3. Brow tension and position
 *  4. Lip compression ratio
 *  5. Micro-movement fidget detection (5-second rolling window)
 *  6. Head / chin lead vs. tuck
 *  7. Duchenne smile detection (eye crinkle vs. mouth-only)
 *
 * Outputs: composite confidenceScore (0–100) and friendlinessScore (0–100).
 * All raw sub-scores are 0–1; final composites are scaled to 0–100.
 */

export interface Pt { x: number; y: number; z: number }

// ── MediaPipe FaceMesh landmark indices ──────────────────────────────────────
// Requires refineLandmarks: true (gives 478 points incl. iris at 468–477)
const LM = {
  // Iris centers (refineLandmarks=true)
  L_IRIS:          468,
  R_IRIS:          473,

  // Eyes
  L_EYE_OUTER:     33,
  L_EYE_INNER:     133,
  L_EYE_TOP:       159,
  L_EYE_BOT:       145,
  L_EYE_BOT_OUT:   153,   // lower outer eyelid

  R_EYE_OUTER:     263,
  R_EYE_INNER:     362,
  R_EYE_TOP:       386,
  R_EYE_BOT:       374,
  R_EYE_BOT_OUT:   380,   // lower outer eyelid

  // Brows
  L_BROW_INNER:    105,
  L_BROW_OUTER:    46,
  R_BROW_INNER:    334,
  R_BROW_OUTER:    276,

  // Mouth
  MOUTH_L:         61,
  MOUTH_R:         291,
  MOUTH_TOP:       13,
  MOUTH_BOT:       14,

  // Face structure
  NOSE_TIP:        4,
  FOREHEAD:        10,
  CHIN:            152,

  // Cheeks (for Duchenne — cheek rise detection)
  L_CHEEK:         116,
  R_CHEEK:         345,
} as const;

// Key landmarks for expressiveness tracking
const EXPR_LM_KEYS = [
  LM.NOSE_TIP, LM.MOUTH_L, LM.MOUTH_R,
  LM.L_EYE_OUTER, LM.R_EYE_OUTER,
  LM.L_BROW_INNER, LM.R_BROW_INNER,
  LM.MOUTH_TOP,
] as const;

// ── Math helpers ─────────────────────────────────────────────────────────────

function clamp(v: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, v));
}
function norm(v: number, lo: number, hi: number): number {
  if (hi === lo) return 0.5;
  return clamp((v - lo) / (hi - lo));
}
function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
}
function get(face: Pt[], idx: number): Pt {
  return face[idx] ?? { x: 0.5, y: 0.5, z: 0 };
}

// ── Baseline (captured during session-start calibration) ─────────────────────

export interface VisionBaseline {
  browGap: number;          // neutral brow-to-eye gap (normalized)
  chinRatio: number;        // neutral (nose-eye) / faceH ratio
  lipRatio: number;         // neutral lip height / lip width
  noseTipVariance: number;  // neutral frame-to-frame motion variance
  irisGazeDev: number;      // neutral iris deviation from eye center
  smileLift: number;        // neutral mouth corner lift
  eyeCheekDist: number;     // neutral lower-eyelid-to-cheek distance
}

// ── Metric 1: Gaze direction & eye contact consistency ───────────────────────

export function scoreGaze(face: Pt[], baseline?: VisionBaseline | null): number {
  const lIris = face[LM.L_IRIS];
  const rIris = face[LM.R_IRIS];
  if (!lIris || !rIris) return 0.5;

  // Left eye bounds
  const lOuter = get(face, LM.L_EYE_OUTER);
  const lInner = get(face, LM.L_EYE_INNER);
  const lTop   = get(face, LM.L_EYE_TOP);
  const lBot   = get(face, LM.L_EYE_BOT);
  const lEyeW  = Math.abs(lOuter.x - lInner.x) || 0.01;
  const lEyeH  = Math.abs(lTop.y   - lBot.y)   || 0.01;

  // Iris position normalized within eye (0=edge, 0.5=center, 1=other edge)
  const lIrisX = (lIris.x - Math.min(lOuter.x, lInner.x)) / lEyeW;
  const lIrisY = (lIris.y - lTop.y) / lEyeH;

  // Right eye
  const rOuter = get(face, LM.R_EYE_OUTER);
  const rInner = get(face, LM.R_EYE_INNER);
  const rTop   = get(face, LM.R_EYE_TOP);
  const rBot   = get(face, LM.R_EYE_BOT);
  const rEyeW  = Math.abs(rOuter.x - rInner.x) || 0.01;
  const rEyeH  = Math.abs(rTop.y   - rBot.y)   || 0.01;

  const rIrisX = (rIris.x - Math.min(rOuter.x, rInner.x)) / rEyeW;
  const rIrisY = (rIris.y - rTop.y) / rEyeH;

  // Deviation from center (0.5, 0.5)
  const lDev = Math.sqrt((lIrisX - 0.5) ** 2 + (lIrisY - 0.5) ** 2);
  const rDev = Math.sqrt((rIrisX - 0.5) ** 2 + (rIrisY - 0.5) ** 2);
  const avgDev = (lDev + rDev) / 2;

  if (baseline) {
    const delta = baseline.irisGazeDev - avgDev; // positive = looking more central
    return clamp(0.55 + delta * 3, 0, 1);
  }
  // Raw: 0 dev = perfect eye contact, 0.35 dev = looking far away
  return norm(avgDev, 0.30, 0.04);
}

// ── Metric 2: Micro-expression velocity & return-to-neutral speed ─────────────

export function scoreMicroExpression(history: Pt[][]): number {
  if (history.length < 4) return 0.5;

  // Frame-to-frame velocity on key landmarks
  const velocities: number[] = [];
  for (let i = 1; i < history.length; i++) {
    let fv = 0;
    for (const idx of EXPR_LM_KEYS) {
      const a = history[i - 1][idx];
      const b = history[i][idx];
      if (!a || !b) continue;
      fv += Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    }
    velocities.push(fv / EXPR_LM_KEYS.length);
  }

  const avgVel = mean(velocities);

  // Return-to-neutral speed: check if velocity decays in the latter half
  const mid    = Math.floor(velocities.length / 2);
  const early  = mean(velocities.slice(0, mid));
  const late   = mean(velocities.slice(mid));
  const decay  = early > 0 ? clamp(1 - late / (early + 1e-6), 0, 1) : 0.5;

  // Good expression: moderate velocity (not frozen, not erratic) + natural decay
  const velScore   = norm(avgVel, 0.0003, 0.003);  // optimal mid-range
  const decayScore = decay;

  return clamp(velScore * 0.6 + decayScore * 0.4, 0, 1);
}

// ── Metric 3: Brow tension and position ──────────────────────────────────────

export function scoreBrowTension(face: Pt[], baseline?: VisionBaseline | null): number {
  const lEyeTop   = get(face, LM.L_EYE_TOP);
  const rEyeTop   = get(face, LM.R_EYE_TOP);
  const lBrowInner = get(face, LM.L_BROW_INNER);
  const rBrowInner = get(face, LM.R_BROW_INNER);
  const lEyeOuter = get(face, LM.L_EYE_OUTER);
  const rEyeOuter = get(face, LM.R_EYE_OUTER);

  const lGap = lEyeTop.y - lBrowInner.y;
  const rGap = rEyeTop.y - rBrowInner.y;
  const avgGap = mean([lGap, rGap]);

  // Brow furrow: normalized lateral distance between inner brows
  const faceW    = Math.abs(lEyeOuter.x - rEyeOuter.x) || 0.01;
  const browFurrow = Math.abs(lBrowInner.x - rBrowInner.x) / faceW;

  // Tension signals: low gap OR narrow furrow
  const gapScore    = baseline
    ? clamp(0.5 + (avgGap - baseline.browGap) * 20, 0, 1)
    : norm(avgGap, 0.018, 0.055);
  const furrowScore = norm(browFurrow, 0.05, 0.28); // low furrow spread = furrowed = tense

  return clamp(gapScore * 0.65 + furrowScore * 0.35, 0, 1);
}

// ── Metric 4: Lip compression ratio ──────────────────────────────────────────

export function scoreLipCompression(face: Pt[], baseline?: VisionBaseline | null): number {
  const lipTop = get(face, LM.MOUTH_TOP);
  const lipBot = get(face, LM.MOUTH_BOT);
  const lipL   = get(face, LM.MOUTH_L);
  const lipR   = get(face, LM.MOUTH_R);

  const lipH = Math.abs(lipBot.y - lipTop.y);
  const lipW = Math.abs(lipL.x  - lipR.x) || 0.01;
  const ratio = lipH / lipW;

  if (baseline) {
    const delta = ratio - baseline.lipRatio;
    return clamp(0.5 + delta * 6, 0, 1); // higher ratio = more open = less compressed
  }
  // Compressed: <0.04, neutral: ~0.08, relaxed/open: >0.14
  return norm(ratio, 0.03, 0.14);
}

// ── Metric 5: Micro-movement fidget detection (5-second window) ───────────────

export function scoreFidget(history5s: Pt[][]): number {
  if (history5s.length < 12) return 0.5;

  // Frame-to-frame delta of nose tip (anchors head)
  const xs = history5s.map(f => get(f, LM.NOSE_TIP).x);
  const ys = history5s.map(f => get(f, LM.NOSE_TIP).y);

  const diffs: number[] = [];
  for (let i = 1; i < xs.length; i++) {
    const dx = xs[i] - xs[i - 1];
    const dy = ys[i] - ys[i - 1];
    diffs.push(Math.sqrt(dx * dx + dy * dy));
  }

  // High-frequency component variance (micro-jitter, not intentional movement)
  const avgDiff = mean(diffs);

  // Score: still-but-natural (0.0005–0.002) = good; fidgety (>0.004) = bad
  // Inverted: high avgDiff = low score
  return norm(avgDiff, 0.005, 0.0004);
}

// ── Metric 6: Head / chin lead vs. tuck ──────────────────────────────────────

export function scoreHeadPosition(face: Pt[], baseline?: VisionBaseline | null): number {
  const noseTip  = face[LM.NOSE_TIP];
  const forehead = face[LM.FOREHEAD];
  const chin     = face[LM.CHIN];
  const lEyeTop  = face[LM.L_EYE_TOP];
  const rEyeTop  = face[LM.R_EYE_TOP];
  if (!noseTip || !forehead || !chin) return 0.5;

  const faceH    = chin.y - forehead.y;
  if (faceH < 0.05) return 0.5;

  const eyeCenterY = mean([(lEyeTop?.y ?? 0.38), (rEyeTop?.y ?? 0.38)]);
  // chinRatio: how far nose is from eye center, relative to face height
  // Confident (chin up): lower ratio; tucked: higher ratio
  const chinRatio = (noseTip.y - eyeCenterY) / faceH;

  if (baseline) {
    const delta = baseline.chinRatio - chinRatio; // positive = chin up vs baseline
    return clamp(0.5 + delta * 8, 0, 1);
  }
  // Tucked: ~0.50+, confident chin up: ~0.22–0.38
  return norm(chinRatio, 0.52, 0.22);
}

// ── Metric 7: Duchenne smile detection ────────────────────────────────────────

export function scoreDuchenneSmile(face: Pt[], baseline?: VisionBaseline | null): number {
  const mouthL   = face[LM.MOUTH_L];
  const mouthR   = face[LM.MOUTH_R];
  const mouthTop = face[LM.MOUTH_TOP];
  if (!mouthL || !mouthR || !mouthTop) return 0.5;

  // Step 1: Mouth-corner lift (smile signal)
  const cornerY   = (mouthL.y + mouthR.y) / 2;
  const smileLift = mouthTop.y - cornerY; // positive = corners lifted = smiling

  const smileScore = baseline
    ? clamp(0.5 + (smileLift - baseline.smileLift) * 25, 0, 1)
    : norm(smileLift, -0.005, 0.025);

  // Step 2: Cheek rise / eye crinkle (orbicularis oculi activation)
  // When cheeks rise, the lower eyelid - cheek distance decreases
  const lEyeBot = face[LM.L_EYE_BOT_OUT];
  const rEyeBot = face[LM.R_EYE_BOT_OUT];
  const lCheek  = face[LM.L_CHEEK];
  const rCheek  = face[LM.R_CHEEK];

  let crinkleScore = 0.5;
  if (lEyeBot && rEyeBot && lCheek && rCheek) {
    const lDist = Math.abs(lCheek.y - lEyeBot.y);
    const rDist = Math.abs(rCheek.y - rEyeBot.y);
    const avgDist = (lDist + rDist) / 2;

    if (baseline) {
      // Smaller dist than baseline = cheeks rose = Duchenne indicator
      const delta = baseline.eyeCheekDist - avgDist;
      crinkleScore = clamp(0.5 + delta * 15, 0, 1);
    } else {
      // Small dist = crinkled (high Duchenne); large dist = no crinkle
      crinkleScore = norm(avgDist, 0.08, 0.03);
    }
  }

  // Duchenne = smile AND crinkle (both must be present)
  // A social smile has smileScore but low crinkleScore
  const duchenne = smileScore * crinkleScore;
  // Bonus: even a partial smile with crinkle scores better than no expression
  const partialBonus = smileScore * 0.25;

  return clamp(duchenne * 0.75 + partialBonus * 0.25, 0, 1);
}

// ── Composite vision scores ───────────────────────────────────────────────────

export interface VisionBreakdown {
  gaze:           number;
  microExpr:      number;
  browTension:    number;
  lipCompression: number;
  fidget:         number;
  headPosition:   number;
  duchenneSmile:  number;
}

export interface VisionScores {
  confidence:   number;  // 0–100
  friendliness: number;  // 0–100
  breakdown:    VisionBreakdown;
}

export function computeVisionScores(
  face: Pt[],
  history3s: Pt[][],
  history5s: Pt[][],
  baseline?: VisionBaseline | null,
): VisionScores {
  const gaze           = scoreGaze(face, baseline);
  const microExpr      = scoreMicroExpression(history3s);
  const browTension    = scoreBrowTension(face, baseline);
  const lipCompression = scoreLipCompression(face, baseline);
  const fidget         = scoreFidget(history5s);
  const headPosition   = scoreHeadPosition(face, baseline);
  const duchenneSmile  = scoreDuchenneSmile(face, baseline);

  // Confidence: gaze, stillness, head posture, lip relaxation, brow calm, some expression
  const confidence = clamp(
    (gaze           * 0.25 +
     headPosition   * 0.20 +
     fidget         * 0.20 +
     browTension    * 0.15 +
     lipCompression * 0.10 +
     microExpr      * 0.10) * 100,
    0, 100,
  );

  // Friendliness: genuine smile, open brows, eye contact, expressiveness
  const friendliness = clamp(
    (duchenneSmile * 0.40 +
     browTension   * 0.25 +   // raised open brows = approachable
     gaze          * 0.20 +   // eye contact = friendly
     microExpr     * 0.15) * 100,
    0, 100,
  );

  return {
    confidence,
    friendliness,
    breakdown: { gaze, microExpr, browTension, lipCompression, fidget, headPosition, duchenneSmile },
  };
}

// ── Calibration helpers ───────────────────────────────────────────────────────

const LS_KEY = "inflect_vision_baseline_v2";

export function loadVisionBaseline(): VisionBaseline | null {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "null"); } catch { return null; }
}
export function saveVisionBaseline(b: VisionBaseline): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(b)); } catch {}
}
export function clearVisionBaseline(): void {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

/** Extract the values needed for calibration from a single frame. */
export function extractCalibFrame(face: Pt[]): Partial<VisionBaseline> {
  const lEyeTop    = get(face, LM.L_EYE_TOP);
  const rEyeTop    = get(face, LM.R_EYE_TOP);
  const lBrowInner = get(face, LM.L_BROW_INNER);
  const rBrowInner = get(face, LM.R_BROW_INNER);
  const lGap = lEyeTop.y - lBrowInner.y;
  const rGap = rEyeTop.y - rBrowInner.y;
  const browGap = mean([lGap, rGap]);

  const noseTip  = face[LM.NOSE_TIP];
  const forehead = face[LM.FOREHEAD];
  const chin     = face[LM.CHIN];
  const faceH    = chin && forehead ? chin.y - forehead.y : 0.5;
  const eyeCenterY = mean([lEyeTop.y, rEyeTop.y]);
  const chinRatio = noseTip && faceH > 0.05
    ? (noseTip.y - eyeCenterY) / faceH
    : 0.35;

  const lipTop = get(face, LM.MOUTH_TOP);
  const lipBot = get(face, LM.MOUTH_BOT);
  const lipL   = get(face, LM.MOUTH_L);
  const lipR   = get(face, LM.MOUTH_R);
  const lipH   = Math.abs(lipBot.y - lipTop.y);
  const lipW   = Math.abs(lipL.x  - lipR.x) || 0.01;
  const lipRatio = lipH / lipW;

  const mouthL   = face[LM.MOUTH_L];
  const mouthR   = face[LM.MOUTH_R];
  const mouthTop = face[LM.MOUTH_TOP];
  const cornerY   = mouthL && mouthR ? (mouthL.y + mouthR.y) / 2 : 0.65;
  const smileLift = mouthTop ? mouthTop.y - cornerY : 0;

  const lEyeBotOut = face[LM.L_EYE_BOT_OUT];
  const rEyeBotOut = face[LM.R_EYE_BOT_OUT];
  const lCheek     = face[LM.L_CHEEK];
  const rCheek     = face[LM.R_CHEEK];
  const eyeCheekDist = (lEyeBotOut && rEyeBotOut && lCheek && rCheek)
    ? ((Math.abs(lCheek.y - lEyeBotOut.y) + Math.abs(rCheek.y - rEyeBotOut.y)) / 2)
    : 0.06;

  return { browGap, chinRatio, lipRatio, smileLift, eyeCheekDist };
}

/** Aggregate calibration frames into a baseline. */
export function buildBaseline(
  frames: Partial<VisionBaseline>[],
  noseTipVariance: number,
  irisGazeDev: number,
): VisionBaseline {
  const avg = <K extends keyof VisionBaseline>(key: K): number => {
    const vals = frames.map(f => f[key] as number).filter(v => v !== undefined && !isNaN(v));
    return vals.length ? mean(vals) : 0;
  };
  return {
    browGap:         avg("browGap"),
    chinRatio:       avg("chinRatio"),
    lipRatio:        avg("lipRatio"),
    smileLift:       avg("smileLift"),
    eyeCheekDist:    avg("eyeCheekDist"),
    noseTipVariance: Math.max(noseTipVariance, 1e-8),
    irisGazeDev:     Math.max(irisGazeDev, 0.01),
  };
}
