import { useState } from "react";

type Props = {
  onClose: () => void;
  onSubmit: (payload: {
    photoAccuracy: number;
    personalityMatch: number;
    honestyLevel: number;
    conversationQuality: number;
    experienceType: string;
    feedback: string;
  }) => void;
};

export default function PostDateRatingModal({ onClose, onSubmit }: Props) {
  const [ratings, setRatings] = useState({
    photoAccuracy: 5,
    personalityMatch: 5,
    honestyLevel: 5,
    conversationQuality: 5,
  });
  const [experienceType, setExperienceType] = useState("");
  const [feedback, setFeedback] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">
          How was your date?
        </h2>
        <p className="text-sm text-slate-500">
          Honest feedback keeps the community accountable.
        </p>
        {[
          { label: "Photo accuracy", key: "photoAccuracy" },
          { label: "Personality match", key: "personalityMatch" },
          { label: "Honesty level", key: "honestyLevel" },
          { label: "Conversation quality", key: "conversationQuality" },
        ].map((item) => (
          <label key={item.key} className="block text-sm text-slate-600">
            {item.label}
            <input
              type="range"
              min="1"
              max="10"
              value={ratings[item.key as keyof typeof ratings]}
              onChange={(e) =>
                setRatings({
                  ...ratings,
                  [item.key]: Number(e.target.value),
                })
              }
              className="w-full"
            />
            <span className="text-xs text-slate-500">
              {ratings[item.key as keyof typeof ratings]}/10
            </span>
          </label>
        ))}
        <div className="flex gap-3">
          {[
            { id: "positive", label: "😊 Positive" },
            { id: "neutral", label: "😐 Neutral" },
            { id: "negative", label: "😞 Negative" },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setExperienceType(option.id)}
              className={`px-3 py-2 rounded-full text-sm font-semibold ${
                experienceType === option.id
                  ? "bg-[#1e40af] text-white"
                  : "border border-slate-200 text-slate-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <textarea
          placeholder="Optional anonymous feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          maxLength={300}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
          rows={3}
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSubmit({
                ...ratings,
                experienceType,
                feedback,
              })
            }
            className="px-4 py-2 rounded-full bg-[#f97316] text-white text-sm font-semibold"
          >
            Submit rating
          </button>
        </div>
      </div>
    </div>
  );
}
