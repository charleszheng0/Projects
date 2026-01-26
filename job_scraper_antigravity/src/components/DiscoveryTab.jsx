import { useState } from 'react'

/**
 * Discovery Tab - Search configuration and real-time search log
 */
function DiscoveryTab({
    isSearching,
    searchLog,
    opportunities = [],
    userProfile,
    onStartSearch,
    onStopSearch,
    onViewOpportunity
}) {
    const [searchConfig, setSearchConfig] = useState({
        sources: {
            linkedin: true,
            indeed: true,
            angellist: true,
            ycombinator: true,
            github: true,
            producthunt: true,
            fundingNews: true,
            companyPages: true
        },
        searchTerms: userProfile?.targetRoles?.join(', ') || 'Software Engineer',
        location: userProfile?.location || 'Remote'
    });

    const handleSourceToggle = (source) => {
        setSearchConfig(prev => ({
            ...prev,
            sources: {
                ...prev.sources,
                [source]: !prev.sources[source]
            }
        }));
    };

    const sourceLabels = {
        linkedin: { name: 'LinkedIn', icon: '💼' },
        indeed: { name: 'Indeed', icon: '📋' },
        angellist: { name: 'AngelList', icon: '👼' },
        ycombinator: { name: 'Y Combinator', icon: '🚀' },
        github: { name: 'GitHub Trending', icon: '🐙' },
        producthunt: { name: 'Product Hunt', icon: '🔥' },
        fundingNews: { name: 'Funding News', icon: '💰' },
        companyPages: { name: 'Company Careers', icon: '🏢' }
    };

    return (
        <div className="discovery-grid">
            {/* Search Configuration Panel */}
            <div className="search-config-panel">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🔧</span> Search Configuration
                </h3>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Search Terms</label>
                    <input
                        type="text"
                        className="form-input"
                        value={searchConfig.searchTerms}
                        onChange={(e) => setSearchConfig(prev => ({ ...prev, searchTerms: e.target.value }))}
                        placeholder="Software Engineer, Backend Developer"
                    />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Location</label>
                    <input
                        type="text"
                        className="form-input"
                        value={searchConfig.location}
                        onChange={(e) => setSearchConfig(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Remote, San Francisco, New York"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '0.75rem' }}>Search Sources</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {Object.entries(sourceLabels).map(([key, { name, icon }]) => (
                            <label
                                key={key}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    background: searchConfig.sources[key] ? 'var(--primary-50)' : 'transparent',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={searchConfig.sources[key]}
                                    onChange={() => handleSourceToggle(key)}
                                />
                                <span>{icon}</span>
                                <span style={{ fontSize: '0.875rem' }}>{name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="search-controls">
                    {isSearching ? (
                        <button className="btn btn-danger" onClick={onStopSearch} style={{ flex: 1 }}>
                            ⏹ Stop Search
                        </button>
                    ) : (
                        <button className="btn btn-primary btn-lg" onClick={onStartSearch} style={{ flex: 1 }}>
                            🔍 Start Search
                        </button>
                    )}
                </div>

                {/* Search Log */}
                <div className="search-log">
                    {searchLog.length === 0 ? (
                        <div className="search-log-entry">
                            <span className="search-log-time">[System]</span>
                            <span className="search-log-message">Ready to start searching...</span>
                        </div>
                    ) : (
                        searchLog.map(entry => (
                            <div key={entry.id} className="search-log-entry">
                                <span className="search-log-time">[{entry.time}]</span>
                                <span className={`search-log-message ${entry.type}`}>
                                    {entry.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Discovered Opportunities Feed */}
            <div className="opportunities-feed">
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>✨</span> Discovered Opportunities
                    </h3>
                    <span style={{
                        color: 'var(--text-tertiary)',
                        fontSize: '0.875rem'
                    }}>
                        {opportunities.length} found
                    </span>
                </div>

                {opportunities.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <h4 className="empty-state-title">No opportunities yet</h4>
                        <p className="empty-state-description">
                            Click "Start Search" to begin discovering job opportunities tailored to your profile.
                        </p>
                    </div>
                ) : (
                    opportunities.slice(0, 10).map(opp => (
                        <div
                            key={opp.id}
                            className={`opportunity-card ${opp.scoreCategory === 'high' ? 'high-score' : ''}`}
                            style={{ marginBottom: '1rem' }}
                        >
                            <div className="opportunity-card-header">
                                <div className="company-logo">{opp.company.logo}</div>
                                <div className="opportunity-info">
                                    <h4 className="opportunity-title">{opp.title}</h4>
                                    <p className="opportunity-company">{opp.company.name}</p>
                                </div>
                                <div className="opportunity-score">
                                    <span className="score-badge">{opp.score}%</span>
                                    <span className="score-label">match</span>
                                </div>
                            </div>

                            <div className="opportunity-tags">
                                {opp.isRemote && (
                                    <span className="opportunity-tag remote">🏠 Remote</span>
                                )}
                                {opp.salary && (
                                    <span className="opportunity-tag salary">
                                        💰 ${Math.round(opp.salary.min / 1000)}k-${Math.round(opp.salary.max / 1000)}k
                                    </span>
                                )}
                                {opp.urgencyFlags?.slice(0, 1).map((flag, i) => (
                                    <span key={i} className="opportunity-tag urgent">⚡ {flag}</span>
                                ))}
                            </div>

                            <div className="opportunity-actions" style={{ borderTop: 'none', paddingTop: '0.5rem' }}>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => onViewOpportunity(opp.id)}
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))
                )}

                {opportunities.length > 10 && (
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => onViewOpportunity(null)}
                        >
                            View All {opportunities.length} Opportunities
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DiscoveryTab
