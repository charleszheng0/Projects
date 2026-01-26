/**
 * Analytics Tab - Performance metrics and insights
 */
function AnalyticsTab({ analytics = {}, applications = [] }) {
    // Calculate additional metrics
    const weeklyData = getWeeklyData(applications);
    const channelPerformance = getChannelPerformance(applications);

    function getWeeklyData(apps) {
        const weeks = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const weekApps = apps.filter(a => {
                const date = new Date(a.appliedDate);
                return date >= weekStart && date < weekEnd;
            });

            weeks.push({
                label: `Week ${7 - i}`,
                applications: weekApps.length,
                responses: weekApps.filter(a => a.status === 'responded' || a.status === 'interview').length
            });
        }

        return weeks;
    }

    function getChannelPerformance(apps) {
        // Simulated channel data
        return [
            { name: 'Direct Apply', apps: 45, responses: 5 },
            { name: 'LinkedIn', apps: 35, responses: 3 },
            { name: 'Email Outreach', apps: 20, responses: 4 },
            { name: 'Referral', apps: 5, responses: 2 }
        ];
    }

    return (
        <div>
            {/* Key Metrics */}
            <div className="analytics-grid">
                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <div className="analytics-card-icon primary">🔍</div>
                    </div>
                    <div className="analytics-value">{analytics.totalSearched || 0}</div>
                    <div className="analytics-label">Jobs Searched</div>
                    <div className="analytics-change positive">+12% this week</div>
                </div>

                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <div className="analytics-card-icon success">📤</div>
                    </div>
                    <div className="analytics-value">{analytics.totalApplied || 0}</div>
                    <div className="analytics-label">Applications Sent</div>
                    <div className="analytics-change positive">+8% this week</div>
                </div>

                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <div className="analytics-card-icon warning">💬</div>
                    </div>
                    <div className="analytics-value">{analytics.responseRate || 0}%</div>
                    <div className="analytics-label">Response Rate</div>
                    <div className="analytics-change positive">+2.5% this week</div>
                </div>

                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <div className="analytics-card-icon success">📅</div>
                    </div>
                    <div className="analytics-value">{analytics.interviewRate || 0}%</div>
                    <div className="analytics-label">Interview Rate</div>
                    <div className="analytics-change positive">+5% this week</div>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                {/* Weekly Activity Chart */}
                <div className="chart-container">
                    <div className="chart-header">
                        <h3 className="chart-title">Weekly Activity</h3>
                        <div className="chart-legend">
                            <div className="legend-item">
                                <span className="legend-dot" style={{ background: 'var(--primary)' }}></span>
                                Applications
                            </div>
                            <div className="legend-item">
                                <span className="legend-dot" style={{ background: 'var(--success)' }}></span>
                                Responses
                            </div>
                        </div>
                    </div>

                    <div className="bar-chart">
                        {weeklyData.map((week, i) => (
                            <div key={i} className="bar-chart-item">
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '100%' }}>
                                    <div
                                        className="bar primary"
                                        style={{ height: `${Math.max(week.applications * 10, 10)}px` }}
                                    />
                                    <div
                                        className="bar success"
                                        style={{ height: `${Math.max(week.responses * 20, 5)}px` }}
                                    />
                                </div>
                                <span className="bar-label">{week.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Channel Performance */}
                <div className="chart-container">
                    <div className="chart-header">
                        <h3 className="chart-title">Channel Performance</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {channelPerformance.map((channel, i) => {
                            const responseRate = channel.apps > 0
                                ? Math.round((channel.responses / channel.apps) * 100)
                                : 0;

                            return (
                                <div key={i}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <span style={{ fontWeight: 500 }}>{channel.name}</span>
                                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                                            {channel.responses}/{channel.apps} ({responseRate}%)
                                        </span>
                                    </div>
                                    <div className="score-progress">
                                        <div
                                            className="score-progress-bar high"
                                            style={{ width: `${responseRate}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Insights Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                {/* Best Performing */}
                <div className="card">
                    <div className="card-body">
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>🏆</span> Top Performers
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{
                                padding: '1rem',
                                background: 'var(--success-50)',
                                borderRadius: 'var(--radius-lg)',
                                borderLeft: '3px solid var(--success)'
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                    Best Resume Variant
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {analytics.topPerformingVariant || 'Tech Startup - Casual Tone'}
                                </div>
                            </div>

                            <div style={{
                                padding: '1rem',
                                background: 'var(--primary-50)',
                                borderRadius: 'var(--radius-lg)',
                                borderLeft: '3px solid var(--primary)'
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                    Best Channel
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {analytics.bestChannel || 'Email Outreach (20% response rate)'}
                                </div>
                            </div>

                            <div style={{
                                padding: '1rem',
                                background: 'var(--warning-50)',
                                borderRadius: 'var(--radius-lg)',
                                borderLeft: '3px solid var(--warning)'
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                    Best Timing
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {analytics.bestTiming || 'Tuesday 10am (highest response rate)'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                <div className="card">
                    <div className="card-body">
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>💡</span> Recommendations
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{
                                padding: '0.75rem',
                                background: 'var(--gray-50)',
                                borderRadius: 'var(--radius-lg)',
                                fontSize: '0.875rem'
                            }}>
                                <strong>Increase application volume:</strong> You're applying to fewer jobs than optimal. Consider increasing to 30+ applications per week.
                            </div>

                            <div style={{
                                padding: '0.75rem',
                                background: 'var(--gray-50)',
                                borderRadius: 'var(--radius-lg)',
                                fontSize: '0.875rem'
                            }}>
                                <strong>Focus on startups:</strong> Your response rate is 3x higher with startups than enterprise companies.
                            </div>

                            <div style={{
                                padding: '0.75rem',
                                background: 'var(--gray-50)',
                                borderRadius: 'var(--radius-lg)',
                                fontSize: '0.875rem'
                            }}>
                                <strong>Try email outreach:</strong> Direct emails to hiring managers have a 2x higher response rate than application portals.
                            </div>

                            <div style={{
                                padding: '0.75rem',
                                background: 'var(--gray-50)',
                                borderRadius: 'var(--radius-lg)',
                                fontSize: '0.875rem'
                            }}>
                                <strong>Apply earlier:</strong> Jobs posted in the last 48 hours have a 40% higher response rate.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Export Section */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-body">
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div>
                            <h4 style={{ marginBottom: '0.25rem' }}>Export Data</h4>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                                Download your application data and analytics
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn btn-secondary">
                                📊 Export Analytics (PDF)
                            </button>
                            <button className="btn btn-secondary">
                                📋 Export Applications (CSV)
                            </button>
                            <button className="btn btn-secondary">
                                📄 Export Resumes (ZIP)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AnalyticsTab
