import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const WindowDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [windowData, setWindowData] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5s for simplicity
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        // Scroll to bottom on load
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchData = async () => {
        try {
            const res = await api.get(`/windows/${id}`);
            setWindowData(res.data.window);
            setMessages(res.data.messages);
        } catch (err) {
            console.error(err);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            await api.post(`/windows/${id}/messages`, { body: newMessage });
            setNewMessage('');
            fetchData(); // Refresh immediately
        } catch (err: any) {
            if (err.response?.status === 429) {
                alert("Daily message limit reached (5/5). Transparency means making every word count.");
            } else {
                alert('Failed to send');
            }
        } finally {
            setSending(false);
        }
    };

    if (!windowData) return <div className="p-6">Loading window...</div>;

    return (
        <div className="flex flex-col h-screen bg-stone-50">
            <header className="bg-white p-4 shadow-sm z-10 flex justify-between items-center">
                <Link to="/windows" className="font-serif">← Back</Link>
                <div className="text-center">
                    <div className="font-bold">Window Details</div>
                    <div className="text-xs text-stone-500">Closes in {Math.max(0, Math.floor((new Date(windowData.end_time).getTime() - Date.now()) / 3600000))} hours</div>
                </div>
                <div className="w-10"></div>
            </header>

            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                <div className="text-center text-xs text-stone-400 py-4">
                    This window is temporary. Say what you mean. (Max 5 messages/day)
                </div>

                {messages.map(m => {
                    const isMe = m.sender_id === user?.id;
                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-3 rounded-lg ${isMe ? 'bg-deep-charcoal text-white' : 'bg-white border border-stone-200'}`}>
                                <p>{m.body}</p>
                                <div className={`text-[10px] mt-1 ${isMe ? 'text-stone-400' : 'text-stone-400'}`}>
                                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef}></div>
            </div>

            <form onSubmit={sendMessage} className="bg-white p-4 border-t border-stone-200 flex gap-2">
                <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-grow border border-stone-300 rounded-full px-4 py-2 focus:outline-none focus:border-stone-500"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={sending}
                    className="bg-deep-charcoal text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50"
                >
                    →
                </button>
            </form>
        </div>
    );
};

export default WindowDetail;
