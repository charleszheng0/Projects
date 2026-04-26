"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import clsx from "clsx";

const STEPS = [
  {
    id: "tracks",
    question: "Which tracks excite you?",
    subtitle: "Pick all that apply",
    type: "multi" as const,
    options: [
      { value: "money", label: "Finance", emoji: "💰" },
      { value: "health", label: "Wellbeing", emoji: "🏃" },
      { value: "eco", label: "Eco", emoji: "🌱" },
      { value: "fun", label: "Fun & Social", emoji: "🎉" },
    ],
  },
  {
    id: "time",
    question: "How much free time do you usually have?",
    subtitle: "Pick one",
    type: "single" as const,
    options: [
      { value: "30", label: "30 minutes", emoji: "⚡" },
      { value: "120", label: "1–2 hours", emoji: "🕐" },
      { value: "480", label: "Half a day+", emoji: "☀️" },
    ],
  },
  {
    id: "location",
    question: "Where are you usually?",
    subtitle: "Pick one",
    type: "single" as const,
    options: [
      { value: "home", label: "At home", emoji: "🏠" },
      { value: "city", label: "In the city", emoji: "🏙️" },
      { value: "outdoors", label: "Outdoors", emoji: "🌲" },
    ],
  },
  {
    id: "energy",
    question: "What's your usual energy level?",
    subtitle: "Pick one",
    type: "single" as const,
    options: [
      { value: "1", label: "Low key", emoji: "😌" },
      { value: "2", label: "Moderate", emoji: "🙂" },
      { value: "3", label: "High energy", emoji: "🔥" },
    ],
  },
  {
    id: "vibe",
    question: "What's your vibe?",
    subtitle: "Pick one",
    type: "single" as const,
    options: [
      { value: "solo", label: "Solo adventures", emoji: "🧍" },
      { value: "friends", label: "With friends", emoji: "👫" },
      { value: "either", label: "Either works", emoji: "✨" },
    ],
  },
];

type Answers = Record<string, string | string[]>;

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    tracks: [],
    time: "",
    location: "",
    energy: "",
    vibe: "",
  });
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];

  function toggle(value: string) {
    if (current.type === "multi") {
      const arr = answers[current.id] as string[];
      setAnswers({
        ...answers,
        [current.id]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      });
    } else {
      setAnswers({ ...answers, [current.id]: value });
    }
  }

  function isSelected(value: string) {
    return current.type === "multi"
      ? (answers[current.id] as string[]).includes(value)
      : answers[current.id] === value;
  }

  function canAdvance() {
    const val = answers[current.id];
    return current.type === "multi" ? (val as string[]).length > 0 : val !== "";
  }

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    if (user) {
      await supabase.from("profiles").update({ preferences: answers }).eq("id", user.id);
    }
    router.push("/");
  }

  return (
    <div className="flex flex-col min-h-screen px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-3">queued</p>
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={clsx(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                i <= step ? "bg-green-500" : "bg-stone-200"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-stone-400 mb-1.5">Step {step + 1} of {STEPS.length}</p>
        <h1 className="text-2xl font-bold text-stone-900 leading-tight">{current.question}</h1>
        <p className="text-stone-400 text-sm mt-1">{current.subtitle}</p>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {current.options.map((opt) => {
          const selected = isSelected(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={clsx(
                "flex items-center gap-4 px-5 py-4 rounded-3xl border-2 text-left transition-all active:scale-[0.98]",
                selected
                  ? "bg-stone-900 border-stone-900 text-white"
                  : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"
              )}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="font-semibold text-base flex-1">{opt.label}</span>
              {selected && <span className="text-green-400 font-bold">✓</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 border-2 border-stone-200 rounded-3xl py-4 font-semibold text-stone-600 transition-all active:scale-[0.98]"
          >
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canAdvance() || saving}
          className="flex-1 bg-stone-900 text-white rounded-3xl py-4 font-semibold disabled:opacity-40 transition-all active:scale-[0.98]"
        >
          {step === STEPS.length - 1 ? (saving ? "Saving..." : "Let's go!") : "Next"}
        </button>
      </div>
    </div>
  );
}
