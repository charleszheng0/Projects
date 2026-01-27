import { useState } from "react";

const endingReasons = [
  "Not feeling a connection",
  "Found someone else",
  "Different life goals",
  "Communication style mismatch",
  "Distance/logistics",
  "Just not the right fit",
  "Other",
];

type Props = {
  onClose: () => void;
  onConfirm: (payload: { reason: string; message: string }) => void;
};

export default function ConversationEndingModal({ onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">
          End Conversation Respectfully
        </h2>
        <p className="text-sm text-slate-500">
          Closure improves your ghosting score. Choose a reason and optionally
          add a kind message.
        </p>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
        >
          <option value="">Select a reason...</option>
          {endingReasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Optional: add a kind message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={200}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
          rows={3}
        />
        <div className="bg-emerald-50 text-emerald-700 text-xs px-3 py-2 rounded-lg">
          ✨ Ending conversations properly improves your Ghosting Score.
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ reason, message })}
            disabled={!reason}
            className="px-4 py-2 rounded-full bg-[#1e40af] text-white text-sm font-semibold disabled:opacity-50"
          >
            Send closure
          </button>
        </div>
      </div>
    </div>
  );
}
