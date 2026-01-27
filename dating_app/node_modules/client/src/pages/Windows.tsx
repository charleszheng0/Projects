import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { differenceInHours, differenceInMinutes } from 'date-fns';

const Windows = () => {
    const [windows, setWindows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWindows();
    }, []);

    const fetchWindows = async () => {
        try {
            const res = await api.get('/windows/active');
            setWindows(res.data.windows);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getTimer = (endTime: string) => {
        const end = new Date(endTime);
        const now = new Date();
        const hours = differenceInHours(end, now);
        const mins = differenceInMinutes(end, now) % 60;

        if (hours < 0) return "Closing...";
        return `${hours}h ${mins}m left`;
    };

    return (
        <div className="min-h-screen bg-stone-50 p-6">
            <header className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
                <Link to="/dashboard" className="font-serif text-xl">← Back</Link>
                <h1 className="text-2xl font-serif">Active Windows</h1>
                <div className="w-10"></div>
            </header>

            <div className="max-w-2xl mx-auto space-y-4">
                {windows.length === 0 && !loading ? (
                    <div className="text-center py-20 opacity-50">
                        No active windows. Go to the Pool to open one.
                    </div>
                ) : windows.map(w => (
                    <Link key={w.id} to={`/windows/${w.id}`} className="block bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition border-l-4 border-deep-charcoal">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold mb-1">{w.partner_name}</h3>
                                <div className="text-sm text-green-700 font-medium">Window Active</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-serif text-stone-800">{getTimer(w.end_time)}</div>
                                <div className="text-xs text-stone-400 uppercase tracking-widest">Auto-Close Timer</div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Windows;
