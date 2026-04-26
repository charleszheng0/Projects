/**
 * Cross-Validation Engine
 *
 * Does NOT average vision and speech scores. Instead it computes a named
 * discrepancy signal that describes the relationship between the two channels.
 *
 * States:
 *   HIGH vision + HIGH speech → "Confident"       — both channels aligned
 *   HIGH vision + LOW  speech → "Masking"          — body calm, voice tense
 *   LOW  vision + HIGH speech → "Grounding Needed" — voice strong, body closed
 *   LOW  vision + LOW  speech → "Full Coaching"    — both channels need work
 */

export type InflectInsight =
  | "Confident"
  | "Masking"
  | "Grounding Needed"
  | "Full Coaching"
  | "Calibrating";

export interface CrossValidationResult {
  insight:     InflectInsight;
  headline:    string;     // short 1-line label for prominent display
  description: string;     // coaching note shown below insight label
  visionScore: number;     // 0–100
  speechScore: number;     // 0–100
  discrepancy: number;     // −1 to +1 (positive = vision > speech)
  color:       string;     // accent color for the insight card
}

/** Minimum number of speech analysis cycles before cross-validation activates. */
const SPEECH_READY_THRESHOLD = 1;

const THRESHOLD = 52; // scores above this = HIGH

export function crossValidate(
  visionScore: number,    // composite of confidence+friendliness, 0–100
  speechScore: number,    // composite speech confidence score, 0–100
  speechCyclesCompleted: number,
): CrossValidationResult {
  const discrepancy = (visionScore - speechScore) / 100;

  if (speechCyclesCompleted < SPEECH_READY_THRESHOLD) {
    return {
      insight:     "Calibrating",
      headline:    "Calibrating…",
      description: "Speak naturally for a few seconds so Inflect can read your voice.",
      visionScore,
      speechScore,
      discrepancy: 0,
      color:       "#3B3B3B",
    };
  }

  const vHigh = visionScore >= THRESHOLD;
  const sHigh = speechScore >= THRESHOLD;

  if (vHigh && sHigh) {
    return {
      insight:     "Confident",
      headline:    "Confident",
      description: "Your face and voice are in sync. You come across as naturally assured.",
      visionScore,
      speechScore,
      discrepancy,
      color:       "#10B981",  // green
    };
  }

  if (vHigh && !sHigh) {
    return {
      insight:     "Masking",
      headline:    "Masking",
      description: "Your face projects calm, but your voice is revealing tension. Slow down and vary your pitch.",
      visionScore,
      speechScore,
      discrepancy,
      color:       "#F59E0B",  // amber
    };
  }

  if (!vHigh && sHigh) {
    return {
      insight:     "Grounding Needed",
      headline:    "Grounding Needed",
      description: "Your voice sounds confident but your body language is guarded. Lift your chin and hold eye contact.",
      visionScore,
      speechScore,
      discrepancy,
      color:       "#8B5CF6",  // purple
    };
  }

  // Both low
  return {
    insight:     "Full Coaching",
    headline:    "Full Coaching",
    description: "Both voice and body need attention. Start here: steady your head and slow your pace.",
    visionScore,
    speechScore,
    discrepancy,
    color:       "#F43F5E",   // red
  };
}

/** Compute a single vision composite (average of confidence and friendliness). */
export function visionComposite(confidence: number, friendliness: number): number {
  return (confidence * 0.6 + friendliness * 0.4);
}
