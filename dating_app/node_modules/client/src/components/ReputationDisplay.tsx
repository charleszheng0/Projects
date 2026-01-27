import React, { useState, useEffect } from 'react';

// Mock storage for now
const getReputation = async (userId: string) => {
    // Return mock data
    return {
        userId,
        ghostingScore: 85,
        authenticityScore: 92,
        responseScore: 78,
        metrics: {
            conversationsCompleted: 38,
            datesAttended: 11,
            datesScheduled: 12,
            avgResponseTime: "4 hours"
        },
        badges: [
            { name: "Respectful Communicator", icon: "💬", description: "Always provides closure" },
            { name: "Reliable Dater", icon: "⭐", description: "Shows up to dates" },
            { name: "Authentic Profile", icon: "✓", description: "Profile accuracy verified" }
        ],
        recentFeedback: [
            { type: "positive", category: "communication", comment: "Very respectful", date: "2025-01-26" },
            { type: "neutral", category: "ghosting", comment: "Ended conversation politely", date: "2025-01-24" }
        ],
        warnings: []
    };
};

const ReputationDisplay = ({ userId }: { userId: string }) => {
    const [reputation, setReputation] = useState<any>(null);

    useEffect(() => {
        loadReputation();
    }, [userId]);

    async function loadReputation() {
        const rep = await getReputation(userId);
        setReputation(rep);
    }

    function getScoreColor(score: number) {
        if (score >= 90) return '#10b981'; // Green
        if (score >= 75) return '#3b82f6'; // Blue
        if (score >= 60) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    }

    function getScoreLabel(score: number) {
        if (score >= 90) return 'Excellent';
        if (score >= 75) return 'Good';
        if (score >= 60) return 'Fair';
        return 'Needs Improvement';
    }

    if (!reputation) return <div>Loading reputation...</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 mt-6">
            <h3 className="font-serif text-xl mb-4 text-deep-charcoal">Accountability Scores</h3>

            {/* Ghosting Score */}
            <div className="mb-4">
                <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-stone-600">💬 Communication</span>
                    <span className="text-sm font-bold" style={{ color: getScoreColor(reputation.ghostingScore) }}>
                        {reputation.ghostingScore}/100
                    </span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2.5">
                    <div
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{
                            width: `${reputation.ghostingScore}%`,
                            backgroundColor: getScoreColor(reputation.ghostingScore)
                        }}
                    />
                </div>
                <span className="text-xs text-stone-500 mt-1 block">{getScoreLabel(reputation.ghostingScore)} communicator</span>
            </div>

            {/* Authenticity Score */}
            <div className="mb-4">
                <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-stone-600">✓ Authenticity</span>
                    <span className="text-sm font-bold" style={{ color: getScoreColor(reputation.authenticityScore) }}>
                        {reputation.authenticityScore}/100
                    </span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2.5">
                    <div
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{
                            width: `${reputation.authenticityScore}%`,
                            backgroundColor: getScoreColor(reputation.authenticityScore)
                        }}
                    />
                </div>
                <span className="text-xs text-stone-500 mt-1 block">Profile accuracy verified by dates</span>
            </div>

            {/* Response Score */}
            <div className="mb-6">
                <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-stone-600">⚡ Responsiveness</span>
                    <span className="text-sm font-bold" style={{ color: getScoreColor(reputation.responseScore) }}>
                        {reputation.responseScore}/100
                    </span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2.5">
                    <div
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{
                            width: `${reputation.responseScore}%`,
                            backgroundColor: getScoreColor(reputation.responseScore)
                        }}
                    />
                </div>
                <span className="text-xs text-stone-500 mt-1 block">Avg response time: {reputation.metrics.avgResponseTime}</span>
            </div>

            {/* Badges */}
            {reputation.badges.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">Earned Badges</h4>
                    <div className="flex flex-wrap gap-2">
                        {reputation.badges.map((badge: any) => (
                            <div key={badge.name} className="flex items-center bg-stone-50 border border-stone-200 rounded-lg px-3 py-2" title={badge.description}>
                                <span className="text-lg mr-2">{badge.icon}</span>
                                <span className="text-xs font-medium text-stone-700">{badge.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-stone-50 p-3 rounded-lg text-center">
                    <span className="block text-xl font-bold text-deep-charcoal">{reputation.metrics.conversationsCompleted}</span>
                    <span className="text-xs text-stone-500">Conversations Ended Properly</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-lg text-center">
                    <span className="block text-xl font-bold text-deep-charcoal">{reputation.metrics.datesAttended}/{reputation.metrics.datesScheduled}</span>
                    <span className="text-xs text-stone-500">Dates Attended</span>
                </div>
            </div>
        </div>
    );
};

export default ReputationDisplay;
