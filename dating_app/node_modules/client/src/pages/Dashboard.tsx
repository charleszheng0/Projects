import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { addHours, format, differenceInMinutes } from 'date-fns';

const Dashboard = () => {
    const { user } = useAuth();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activityTag, setActivityTag] = useState('Working');
    const [statusText, setStatusText] = useState('');

    const fetchSession = async () => {
        try {
            // Just check pool for self or a specific "current session" endpoint?
            // Since we didn't make a specific "get my active session", we can infer or add one.
            // But let's just use the pool logic or assume if I "start", I get it back.
            // Actually, for MVP dashboard, let's just let user Start.
            // If we re-load, we might lose state unless we query.
            // Let's query Profile/Me again or separate session endpoint.
            // For now, simple "Start" button unless we know otherwise.
            // We can query /api/presence/pool and filter for self? No, pool excludes self.
            // Let's add a quick check for "latest session" in /me or just in dashboard.
            // Or just start fresh every time for MVP simplicity (or use local storage for timer).
            // Let's do a simple call to get recent session.
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startHour = async () => {
        try {
            const res = await api.post('/presence/start', { activity_tag: activityTag, status_text: statusText });
            setSession(res.data.session);
        } catch (err) {
            alert('Failed to start session');
        }
    };

    // Timer logic
    const [timeLeft, setTimeLeft] = useState<number>(0);

    useEffect(() => {
        if (session) {
            const end = new Date(session.end_time);
            const interval = setInterval(() => {
                const diff = differenceInMinutes(end, new Date());
                setTimeLeft(diff);
                if (diff <= 0) {
                    // Session over
                    // setSession(null); 
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [session]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-stone-50 p-6">
            <header className="max-w-4xl mx-auto flex justify-between items-center mb-12">
                <h1 className="text-2xl font-serif">Immunity</h1>
                <nav className="space-x-4">
                    <Link to="/pool" className="text-stone-600 hover:text-deep-charcoal">Pool</Link>
                    <Link to="/windows" className="text-stone-600 hover:text-deep-charcoal">Windows</Link>
                    <span className="text-stone-400">|</span>
                    <span className="font-medium">{user.display_name}</span>
                </nav>
            </header>

            <main className="max-w-2xl mx-auto">
                {!session || timeLeft <= 0 ? (
                    <div className="bg-white p-8 rounded-xl shadow-sm text-center">
                        <h2 className="text-3xl font-serif mb-4 text-stone-800">You are currently hidden.</h2>
                        <p className="text-stone-500 mb-8">
                            To see others and be seen, you must broadcast 1 hour of unscripted life.
                        </p>

                        <div className="max-w-xs mx-auto space-y-4 mb-6 text-left">
                            <div>
                                <label className="block text-sm font-medium mb-1">Current Activity</label>
                                <select
                                    className="w-full border p-2 rounded"
                                    value={activityTag}
                                    onChange={e => setActivityTag(e.target.value)}
                                >
                                    <option>Working</option>
                                    <option>Cooking</option>
                                    <option>Walking</option>
                                    <option>Resting</option>
                                    <option>Reading</option>
                                    <option>Exercising</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Status (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Deep focus mode"
                                    className="w-full border p-2 rounded"
                                    value={statusText}
                                    onChange={e => setStatusText(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            onClick={startHour}
                            className="w-full py-4 bg-deep-charcoal text-white rounded-lg text-lg hover:bg-opacity-90 transition"
                        >
                            Start My Hour
                        </button>
                    </div>
                ) : (
                    <div className="bg-cinematic-beige p-8 rounded-xl text-center border border-stone-200">
                        <div className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold tracking-wide uppercase mb-4">
                            Live
                        </div>
                        <h2 className="text-4xl font-serif mb-2">{timeLeft} min left</h2>
                        <p className="opacity-60 mb-8">You are visible to the pool.</p>

                        <div className="text-lg font-medium">{session.activity_tag}</div>
                        <div className="opacity-70">"{session.status_text}"</div>

                        <div className="mt-8 pt-8 border-t border-stone-200/50">
                            <Link to="/pool" className="btn-primary inline-block bg-deep-charcoal text-white px-6 py-3 rounded-lg">
                                Browse the Pool
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
