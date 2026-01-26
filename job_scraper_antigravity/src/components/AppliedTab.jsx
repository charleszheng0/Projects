import { useState } from 'react'

/**
 * Applied Tab - Track application status and timeline
 */
function AppliedTab({ applications = [] }) {
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date');

    // Filter applications
    const filteredApplications = applications.filter(app => {
        if (filter === 'all') return true;
        return app.status === filter;
    });

    // Sort applications
    const sortedApplications = [...filteredApplications].sort((a, b) => {
        if (sortBy === 'date') return new Date(b.appliedDate) - new Date(a.appliedDate);
        if (sortBy === 'status') return getStatusPriority(b.status) - getStatusPriority(a.status);
        return 0;
    });

    function getStatusPriority(status) {
        const priorities = { interview: 4, responded: 3, viewed: 2, sent: 1, rejected: 0 };
        return priorities[status] || 0;
    }

    function getStatusIcon(status) {
        const icons = {
            sent: '📤',
            viewed: '👀',
            responded: '💬',
            interview: '📅',
            rejected: '❌'
        };
        return icons[status] || '📋';
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Stats
    const stats = {
        total: applications.length,
        sent: applications.filter(a => a.status === 'sent').length,
        viewed: applications.filter(a => a.status === 'viewed').length,
        responded: applications.filter(a => a.status === 'responded').length,
        interview: applications.filter(a => a.status === 'interview').length,
        rejected: applications.filter(a => a.status === 'rejected').length
    };

    const responseRate = stats.total > 0
        ? Math.round((stats.responded + stats.interview) / stats.total * 100)
        : 0;

    return (
        <div>
            {/* Stats Overview */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div className="stat-card" style={{ textAlign: 'left', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                        Total Sent
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>
                        {stats.total}
                    </div>
                </div>

                <div className="stat-card" style={{ textAlign: 'left', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                        Awaiting
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--gray-600)' }}>
                        {stats.sent}
                    </div>
                </div>

                <div className="stat-card" style={{ textAlign: 'left', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                        Viewed
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>
                        {stats.viewed}
                    </div>
                </div>

                <div className="stat-card" style={{ textAlign: 'left', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                        Responses
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>
                        {stats.responded}
                    </div>
                </div>

                <div className="stat-card" style={{ textAlign: 'left', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                        Interviews
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--warning)' }}>
                        {stats.interview}
                    </div>
                </div>

                <div className="stat-card" style={{ textAlign: 'left', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                        Response Rate
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: responseRate > 10 ? 'var(--success)' : 'var(--gray-600)' }}>
                        {responseRate}%
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '1.5rem',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                    {[
                        { value: 'all', label: 'All' },
                        { value: 'sent', label: 'Sent' },
                        { value: 'viewed', label: 'Viewed' },
                        { value: 'responded', label: 'Responded' },
                        { value: 'interview', label: 'Interview' }
                    ].map(f => (
                        <button
                            key={f.value}
                            className={`btn btn-sm ${filter === f.value ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter(f.value)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Sort:</span>
                    <select
                        className="form-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{ width: 'auto', padding: '0.5rem 1rem' }}
                    >
                        <option value="date">Date Applied</option>
                        <option value="status">Status</option>
                    </select>
                </div>
            </div>

            {/* Applications List */}
            {sortedApplications.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <h4 className="empty-state-title">No applications yet</h4>
                    <p className="empty-state-description">
                        Apply to opportunities from the Opportunities tab to start tracking your applications.
                    </p>
                </div>
            ) : (
                <div className="applications-list">
                    {sortedApplications.map(app => (
                        <div key={app.id} className="application-card">
                            <div className="application-header">
                                <div className="application-info">
                                    <h4>{app.title}</h4>
                                    <p className="application-company">{app.company}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                                        {formatDate(app.appliedDate)}
                                    </span>
                                    <span className={`status-badge ${app.status}`}>
                                        {getStatusIcon(app.status)} {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                    </span>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="application-timeline">
                                {app.timeline.map((step, index) => (
                                    <React.Fragment key={step.step}>
                                        <div className={`timeline-step ${step.completed ? 'completed' : ''} ${!step.completed && index > 0 && app.timeline[index - 1].completed ? 'current' : ''
                                            }`}>
                                            <div className="timeline-step-dot" />
                                            <span className="timeline-step-label">{step.step}</span>
                                        </div>
                                        {index < app.timeline.length - 1 && (
                                            <div className={`timeline-connector ${step.completed ? 'completed' : ''}`} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AppliedTab
