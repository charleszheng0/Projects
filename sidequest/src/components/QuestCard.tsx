import { Clock, Zap, MapPin } from "lucide-react";
import type { Quest } from "@/types";
import { TRACK_META, ENERGY_LABELS } from "@/types";
import clsx from "clsx";

interface Props {
  quest: Quest;
  compact?: boolean;
  onClick?: () => void;
}

export default function QuestCard({ quest, compact = false, onClick }: Props) {
  const meta = TRACK_META[quest.track];

  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white rounded-3xl shadow-card border border-stone-100 cursor-pointer hover:shadow-card-hover transition-all active:scale-[0.98]",
        compact ? "p-4" : "p-5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={clsx("text-xs font-semibold px-2.5 py-1 rounded-full", meta.bg, meta.color)}>
              {meta.emoji} {meta.label}
            </span>
          </div>
          <h3 className={clsx("font-bold text-stone-900 leading-snug", compact ? "text-sm" : "text-base")}>
            {quest.title}
          </h3>
          {!compact && (
            <p className="text-stone-500 text-sm mt-1.5 leading-relaxed line-clamp-2">{quest.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1 text-stone-400">
            <span className="text-yellow-500 text-sm">★</span>
            <span className="text-xs font-medium text-stone-600">{(quest.community_rating ?? 0).toFixed(1)}</span>
          </div>
          <span className="text-xs text-stone-400">({quest.rating_count ?? 0})</span>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1 text-stone-400">
          <Clock size={13} />
          <span className="text-xs">{quest.time_minutes < 60 ? `${quest.time_minutes}m` : `${Math.round(quest.time_minutes / 60)}h`}</span>
        </div>
        <div className="flex items-center gap-1 text-stone-400">
          <Zap size={13} />
          <span className="text-xs">{ENERGY_LABELS[quest.energy_level]}</span>
        </div>
        <div className="flex items-center gap-1 text-stone-400">
          <MapPin size={13} />
          <span className="text-xs capitalize">{quest.location_type}</span>
        </div>
      </div>

      {quest.tags.length > 0 && !compact && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {quest.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
