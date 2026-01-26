/**
 * Sidebar component with quick stats, priority alerts, and recent activity
 */
function Sidebar({ isOpen, quickStats, priorityAlerts = [], recentActivity = [], onAlertClick }) {
    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            {/* Quick Stats Section */}
            <section className="sidebar-section">
                <h3 className="sidebar-section-title">Quick Stats</h3>
                <div className="quick-stats">
                    <div className="stat-card">
                        <div className="stat-value">{quickStats?.jobsFound || 0}</div>
                        <div className="stat-label">Jobs Found</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{quickStats?.applicationsSent || 0}</div>
                        <div className="stat-label">Applied</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{quickStats?.responses || 0}</div>
                        <div className="stat-label">Responses</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{quickStats?.interviews || 0}</div>
                        <div className="stat-label">Interviews</div>
                    </div>
                </div>
            </section>

            {/* Priority Alerts Section */}
            {priorityAlerts.length > 0 && (
                <section className="sidebar-section">
                    <h3 className="sidebar-section-title">Priority Alerts</h3>
                    <div className="priority-alerts">
                        {priorityAlerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`priority-alert ${alert.type}`}
                                onClick={() => onAlertClick?.(alert.id)}
                            >
                                <span className="priority-alert-icon">
                                    {alert.type === 'funding' ? '💰' : '🔥'}
                                </span>
                                <div className="priority-alert-content">
                                    <div className="priority-alert-title">{alert.title}</div>
                                    <div className="priority-alert-subtitle">{alert.subtitle}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Recent Activity Section */}
            <section className="sidebar-section">
                <h3 className="sidebar-section-title">Recent Activity</h3>
                <div className="recent-activity">
                    {recentActivity.length === 0 ? (
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                            No recent activity
                        </p>
                    ) : (
                        recentActivity.map(activity => (
                            <div key={activity.id} className="activity-item">
                                <div className={`activity-icon ${activity.type}`}>
                                    {activity.icon}
                                </div>
                                <div className="activity-content">
                                    <div className="activity-text">{activity.text}</div>
                                    <div className="activity-time">{activity.time}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </aside>
    );
}

export default Sidebar
