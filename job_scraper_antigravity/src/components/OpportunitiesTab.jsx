import { useState } from 'react'

/**
 * Opportunities Tab - View and manage job opportunities with generated materials
 */
function OpportunitiesTab({
    opportunities = [],
    resumeVariants = {},
    coverLetters = {},
    onGenerateMaterials,
    onApply,
    onSkip
}) {
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('score');
    const [expandedId, setExpandedId] = useState(null);
    const [showPreview, setShowPreview] = useState({ type: null, id: null });

    // Filter opportunities
    const filteredOpportunities = opportunities.filter(opp => {
        if (filter === 'all') return true;
        if (filter === 'high') return opp.score >= 70;
        if (filter === 'medium') return opp.score >= 40 && opp.score < 70;
        if (filter === 'urgent') return opp.urgencyFlags && opp.urgencyFlags.length > 0;
        if (filter === 'remote') return opp.isRemote;
        return true;
    });

    // Sort opportunities
    const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
        if (sortBy === 'score') return b.score - a.score;
        if (sortBy === 'date') return new Date(b.postedDate) - new Date(a.postedDate);
        if (sortBy === 'salary') {
            const aSalary = a.salary?.max || 0;
            const bSalary = b.salary?.max || 0;
            return bSalary - aSalary;
        }
        return 0;
    });

    const handleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);

        // Generate materials when expanding if not already done
        if (expandedId !== id) {
            const opp = opportunities.find(o => o.id === id);
            if (opp && !resumeVariants[id]) {
                onGenerateMaterials(opp);
            }
        }
    };

    const getScoreColor = (score) => {
        if (score >= 70) return 'var(--success)';
        if (score >= 40) return 'var(--warning)';
        return 'var(--gray-400)';
    };

    return (
        <div>
            {/* Filters and Sorting */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '1.5rem',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                    {[
                        { value: 'all', label: 'All', count: opportunities.length },
                        { value: 'high', label: 'High Match', count: opportunities.filter(o => o.score >= 70).length },
                        { value: 'urgent', label: 'Urgent', count: opportunities.filter(o => o.urgencyFlags?.length > 0).length },
                        { value: 'remote', label: 'Remote', count: opportunities.filter(o => o.isRemote).length }
                    ].map(f => (
                        <button
                            key={f.value}
                            className={`btn btn-sm ${filter === f.value ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter(f.value)}
                        >
                            {f.label} ({f.count})
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Sort by:</span>
                    <select
                        className="form-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{ width: 'auto', padding: '0.5rem 1rem' }}
                    >
                        <option value="score">Match Score</option>
                        <option value="date">Posted Date</option>
                        <option value="salary">Salary</option>
                    </select>
                </div>
            </div>

            {/* Opportunities List */}
            {sortedOpportunities.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <h4 className="empty-state-title">No opportunities found</h4>
                    <p className="empty-state-description">
                        {filter !== 'all'
                            ? 'Try adjusting your filters to see more results.'
                            : 'Start a search in the Discovery tab to find opportunities.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sortedOpportunities.map(opp => (
                        <div
                            key={opp.id}
                            className={`opportunity-card ${opp.urgencyFlags?.length > 0 ? 'high-priority' : ''} ${opp.score >= 70 ? 'high-score' : ''}`}
                        >
                            {/* Card Header */}
                            <div
                                className="opportunity-card-header"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleExpand(opp.id)}
                            >
                                <div className="company-logo">
                                    {opp.company.logo}
                                </div>
                                <div className="opportunity-info">
                                    <h4 className="opportunity-title">{opp.title}</h4>
                                    <p className="opportunity-company">
                                        {opp.company.name}
                                        {opp.company.type && <span> • {opp.company.type}</span>}
                                    </p>
                                </div>
                                <div className="opportunity-score">
                                    <span
                                        className="score-badge"
                                        style={{ color: getScoreColor(opp.score) }}
                                    >
                                        {opp.score}%
                                    </span>
                                    <span className="score-label">match</span>
                                </div>
                            </div>

                            {/* Score Progress Bar */}
                            <div style={{ padding: '0 1rem' }}>
                                <div className="score-progress">
                                    <div
                                        className={`score-progress-bar ${opp.scoreCategory}`}
                                        style={{ width: `${opp.score}%` }}
                                    />
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="opportunity-tags">
                                {opp.isRemote && (
                                    <span className="opportunity-tag remote">🏠 Remote</span>
                                )}
                                {opp.isHybrid && (
                                    <span className="opportunity-tag">🏢 Hybrid</span>
                                )}
                                {opp.salary && (
                                    <span className="opportunity-tag salary">
                                        💰 ${Math.round(opp.salary.min / 1000)}k-${Math.round(opp.salary.max / 1000)}k
                                    </span>
                                )}
                                {opp.urgencyFlags?.slice(0, 2).map((flag, i) => (
                                    <span key={i} className="opportunity-tag urgent">⚡ {flag}</span>
                                ))}
                                {opp.company.isYCBacked && (
                                    <span className="opportunity-tag" style={{ background: 'var(--warning-100)', color: 'var(--warning-dark)' }}>
                                        🚀 YC Backed
                                    </span>
                                )}
                            </div>

                            {/* Highlights */}
                            <div className="opportunity-highlights">
                                {opp.requirements?.slice(0, 4).map((req, i) => (
                                    <div key={i} className="highlight-item">
                                        <span className="highlight-icon">✓</span>
                                        <span>{req}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Expanded Content */}
                            {expandedId === opp.id && (
                                <div style={{ padding: '0 1rem 1rem' }}>
                                    {/* Description */}
                                    <div className="preview-section">
                                        <div className="preview-title">📝 Job Description</div>
                                        <div className="preview-content">
                                            {opp.description}
                                        </div>
                                    </div>

                                    {/* Company Analysis */}
                                    {opp.growthSignals?.indicators?.length > 0 && (
                                        <div className="preview-section" style={{ background: 'var(--success-50)' }}>
                                            <div className="preview-title">📈 Growth Signals</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {opp.growthSignals.indicators.map((signal, i) => (
                                                    <span
                                                        key={i}
                                                        className="tag"
                                                        style={{
                                                            background: signal.impact === 'high' ? 'var(--success-100)' : 'var(--gray-100)',
                                                            color: signal.impact === 'high' ? 'var(--success-dark)' : 'var(--gray-700)'
                                                        }}
                                                    >
                                                        {signal.text}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Generated Resume Preview */}
                                    {resumeVariants[opp.id] && (
                                        <div className="preview-section">
                                            <div className="preview-title">
                                                📄 Generated Resume
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    style={{ marginLeft: 'auto' }}
                                                    onClick={() => setShowPreview({ type: 'resume', id: opp.id })}
                                                >
                                                    View Full
                                                </button>
                                            </div>
                                            <div className="preview-content" style={{ maxHeight: '100px', overflow: 'hidden' }}>
                                                <strong>Summary:</strong> {resumeVariants[opp.id].summary}
                                                <br /><br />
                                                <strong>Format:</strong> {resumeVariants[opp.id].format} |
                                                <strong> Tone:</strong> {resumeVariants[opp.id].tone}
                                            </div>
                                        </div>
                                    )}

                                    {/* Generated Cover Letter Preview */}
                                    {coverLetters[opp.id] && (
                                        <div className="preview-section">
                                            <div className="preview-title">
                                                ✉️ Generated Cover Letter
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    style={{ marginLeft: 'auto' }}
                                                    onClick={() => setShowPreview({ type: 'cover', id: opp.id })}
                                                >
                                                    View Full
                                                </button>
                                            </div>
                                            <div className="preview-content" style={{ maxHeight: '150px', overflow: 'hidden' }}>
                                                {coverLetters[opp.id].substring(0, 300)}...
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="opportunity-actions">
                                <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={(e) => { e.stopPropagation(); onSkip(opp.id); }}
                                >
                                    Skip
                                </button>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={(e) => { e.stopPropagation(); handleExpand(opp.id); }}
                                >
                                    {expandedId === opp.id ? 'Collapse' : 'View Details'}
                                </button>
                                <button
                                    className="btn btn-sm btn-success"
                                    onClick={(e) => { e.stopPropagation(); onApply(opp); }}
                                >
                                    Apply Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Preview Modal */}
            {showPreview.type && (
                <div className="modal-overlay" onClick={() => setShowPreview({ type: null, id: null })}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {showPreview.type === 'resume' ? '📄 Generated Resume' : '✉️ Cover Letter'}
                            </h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowPreview({ type: null, id: null })}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            {showPreview.type === 'resume' && resumeVariants[showPreview.id] && (
                                <div>
                                    <h4 style={{ marginBottom: '1rem' }}>Professional Summary</h4>
                                    <p>{resumeVariants[showPreview.id].summary}</p>

                                    <h4 style={{ margin: '1.5rem 0 1rem' }}>Skills</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {resumeVariants[showPreview.id].skills?.technical?.map((skill, i) => (
                                            <span key={i} className="tag">{skill}</span>
                                        ))}
                                    </div>

                                    <h4 style={{ margin: '1.5rem 0 1rem' }}>Format & Tone</h4>
                                    <p>
                                        <strong>Format:</strong> {resumeVariants[showPreview.id].format}<br />
                                        <strong>Tone:</strong> {resumeVariants[showPreview.id].tone}
                                    </p>
                                </div>
                            )}

                            {showPreview.type === 'cover' && coverLetters[showPreview.id] && (
                                <div className="preview-content" style={{ whiteSpace: 'pre-wrap' }}>
                                    {coverLetters[showPreview.id]}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowPreview({ type: null, id: null })}
                            >
                                Close
                            </button>
                            <button className="btn btn-primary">
                                📋 Copy to Clipboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OpportunitiesTab
