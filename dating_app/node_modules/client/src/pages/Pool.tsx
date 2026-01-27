import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const Pool = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPool();
    }, []);

    const fetchPool = async () => {
        try {
            const res = await api.get('/presence/pool');
            setUsers(res.data.users);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openWindow = async (targetId: string) => {
        try {
            await api.post('/windows', { target_user_id: targetId });
            alert('Window opened! Check your Active Windows.');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to open window');
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 p-6">
            <header className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
                <Link to="/dashboard" className="font-serif text-xl">← Back</Link>
                <h1 className="text-2xl font-serif">The Pool</h1>
                <div className="w-10"></div>
            </header>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                {users.length === 0 && !loading ? (
                    <div className="col-span-2 text-center py-20 opacity-50">
                        No one else is visible right now. Start your hour and check back.
                    </div>
                ) : users.map(u => (
                    <div key={u.id} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold">{u.display_name}, {u.age}</h3>
                                <div className="text-sm text-stone-500">{u.city}</div>
                            </div>
                            <span className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded">
                                {u.activity_tag}
                            </span>
                        </div>

                        <p className="text-stone-600 italic mb-6">"{u.status_text || 'Just living.'}"</p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {u.routine_tags?.map((tag: string, i: number) => (
                                <span key={i} className="text-xs bg-stone-100 px-2 py-1 rounded-full text-stone-500">
                                    #{tag}
                                </span>
                            ))}
                        </div>

                        <button
                            onClick={() => openWindow(u.id)}
                            className="w-full py-2 border border-deep-charcoal text-deep-charcoal rounded hover:bg-deep-charcoal hover:text-white transition"
                        >
                            Open Shared Window (48h)
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Pool;
