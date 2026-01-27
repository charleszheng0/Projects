import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ConversationEndingModal from "../components/ConversationEndingModal";
import PostDateRatingModal from "../components/PostDateRatingModal";
import { storage } from "../utils/storage";
import { currentUserId, seedProfile } from "../data/mockData";

export default function Chat() {
  const { id } = useParams();
  const [conversation, setConversation] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [showEnding, setShowEnding] = useState(false);
  const [showRating, setShowRating] = useState(false);

  const photoUnlockStatus = useMemo(() => {
    if (!conversation) return { unlocked: false, messageCount: 0 };
    const messageCount = conversation.messages.length;
    return {
      unlocked: conversation.photosUnlocked || messageCount >= 20,
      messageCount,
    };
  }, [conversation]);

  useEffect(() => {
    const loadConversation = async () => {
      const stored = await storage.get("matches");
      const matches = stored?.value ? JSON.parse(stored.value) : [];
      const match = matches.find((item: any) => item.id === id);
      if (match) {
        setConversation(match);
      }
    };
    loadConversation();
  }, [id]);

  const otherUser = useMemo(() => {
    if (!conversation) return seedProfile;
    return { ...seedProfile, name: conversation.name, userId: conversation.userId };
  }, [conversation]);

  const handleSend = async () => {
    if (!message.trim() || !conversation) return;
    const updated = {
      ...conversation,
      messages: [
        ...conversation.messages,
        {
          id: `m_${Date.now()}`,
          senderId: currentUserId,
          content: message.trim(),
          timestamp: new Date().toISOString(),
        },
      ],
      lastMessage: message.trim(),
      lastUpdated: new Date().toISOString(),
    };
    setConversation(updated);
    setMessage("");
    await syncMatches(updated);
  };

  const syncMatches = async (updated: any) => {
    const stored = await storage.get("matches");
    const matches = stored?.value ? JSON.parse(stored.value) : [];
    const next = matches.map((match: any) =>
      match.id === updated.id ? updated : match
    );
    await storage.set("matches", JSON.stringify(next));
  };

  const handleUnlockPhotos = async () => {
    const updated = { ...conversation, photosUnlocked: true };
    setConversation(updated);
    await syncMatches(updated);
  };

  const handleConversationEnd = async ({ reason, message: note }: any) => {
    const updated = {
      ...conversation,
      status: "ended_properly",
      lastMessage: `Conversation ended: ${reason}`,
      lastUpdated: new Date().toISOString(),
      endReason: reason,
      closureNote: note,
    };
    setConversation(updated);
    await syncMatches(updated);
    setShowEnding(false);
    setShowRating(true);
  };

  if (!conversation) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10 text-slate-500">
        Loading conversation...
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <Link to="/matches" className="text-sm text-slate-500 hover:underline">
        ← Back to matches
      </Link>

      {!photoUnlockStatus.unlocked && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
          <p>
            📸 Photos unlock after 20 messages ({photoUnlockStatus.messageCount}/20)
            or mutual agreement.
          </p>
          <button
            onClick={handleUnlockPhotos}
            className="mt-3 px-4 py-2 rounded-full bg-[#1e40af] text-white text-sm font-semibold"
          >
            Request photo unlock
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {conversation.name}
            </h1>
            <p className="text-sm text-slate-500">
              Status: {conversation.status}
            </p>
          </div>
          <button
            onClick={() => setShowEnding(true)}
            className="px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            End conversation
          </button>
        </div>

        <div className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50">
          {conversation.messages.map((msg: any) => (
            <div
              key={msg.id}
              className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                msg.senderId === currentUserId
                  ? "bg-[#1e40af] text-white ml-auto"
                  : "bg-white text-slate-700"
              }`}
            >
              <p>{msg.content}</p>
              <span className="text-[10px] opacity-70 block mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
            placeholder="Type a message..."
          />
          <button
            onClick={handleSend}
            className="px-5 py-2 rounded-xl bg-[#1e40af] text-white text-sm font-semibold"
          >
            Send
          </button>
        </div>
      </div>

      {photoUnlockStatus.unlocked && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Photos unlocked
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {otherUser.photos.images.map((photo: any, idx: number) => (
              <img
                key={idx}
                src={photo.url}
                alt={`${otherUser.name} ${idx}`}
                className="rounded-xl object-cover h-32 w-full"
              />
            ))}
          </div>
        </div>
      )}

      {showEnding && (
        <ConversationEndingModal
          onClose={() => setShowEnding(false)}
          onConfirm={handleConversationEnd}
        />
      )}

      {showRating && (
        <PostDateRatingModal
          onClose={() => setShowRating(false)}
          onSubmit={() => setShowRating(false)}
        />
      )}
    </main>
  );
}
