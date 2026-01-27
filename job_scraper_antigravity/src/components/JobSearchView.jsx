import React, { useState } from 'react';
import { searchJobs, calculateMatchScore, analyzeUrgency } from '../services/jobSearchService';

export default function JobSearchView({ userProfile, onApply }) {
    const [config, setConfig] = useState({
        targetRoles: userProfile?.targetRoles || [],
        location: userProfile?.location || '',
        remote: true
    });

    const [isSearching, setIsSearching] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [selectedJobs, setSelectedJobs] = useState([]);

    const handleSearch = async () => {
        setIsSearching(true);
        setJobs([]);
        setSelectedJobs([]);

        try {
            const results = await searchJobs(config);

            // Score and process results
            const scoredJobs = results.map(job => ({
                ...job,
                matchScore: calculateMatchScore(job, userProfile),
                urgencyFlags: analyzeUrgency(job)
            })).sort((a, b) => b.matchScore - a.matchScore);

            setJobs(scoredJobs);
        } catch (error) {
            alert('Search failed: ' + error.message);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleJobSelection = (job) => {
        if (selectedJobs.find(j => j.id === job.id)) {
            setSelectedJobs(selectedJobs.filter(j => j.id !== job.id));
        } else {
            setSelectedJobs([...selectedJobs, job]);
        }
    };

    const handleAutoApply = () => {
        onApply(selectedJobs);
    };

    return (
        <div className="job-search-view fade-in">
            <div className="search-header-panel">
                <h1>Discovery Engine</h1>
                <p>Finds opportunities from across the web matching your profile</p>

                <div className="search-controls">
                    <input
                        placeholder="Target Roles (comma separated)"
                        value={config.targetRoles.join(', ')}
                        onChange={e => setConfig({ ...config, targetRoles: e.target.value.split(',').map(s => s.trim()) })}
                        className="search-input"
                    />
                    <input
                        placeholder="Location"
                        value={config.location}
                        onChange={e => setConfig({ ...config, location: e.target.value })}
                        className="search-input"
                    />
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={config.remote}
                            onChange={e => setConfig({ ...config, remote: e.target.checked })}
                        />
                        Remote
                    </label>
                    <button
                        className="primary-button"
                        onClick={handleSearch}
                        disabled={isSearching}
                    >
                        {isSearching ? <span className="spinner small"></span> : '🔍 Start Search'}
                    </button>
                </div>
            </div>

            <div className="search-results-area">
                {jobs.length > 0 && (
                    <div className="results-toolbar">
                        <span>Found {jobs.length} opportunities</span>
                        {selectedJobs.length > 0 && (
                            <button className="primary-button small" onClick={handleAutoApply}>
                                Auto-Apply to Selected ({selectedJobs.length})
                            </button>
                        )}
                    </div>
                )}

                <div className="job-grid">
                    {jobs.map(job => (
                        <div
                            key={job.id}
                            className={`job-card ${selectedJobs.find(j => j.id === job.id) ? 'selected' : ''}`}
                            onClick={() => toggleJobSelection(job)}
                        >
                            <div className="job-score-badge" style={{
                                background: `conic-gradient(#10b981 ${job.matchScore}%, #f3f4f6 0)`
                            }}>
                                <span>{job.matchScore}</span>
                            </div>

                            <div className="job-info">
                                <h3>{job.title}</h3>
                                <p className="company">{job.company}</p>
                                <div className="job-meta">
                                    <span>{job.location}</span>
                                    {job.salary && <span>• {job.salary}</span>}
                                </div>

                                <div className="tags">
                                    {job.urgencyFlags.map(flag => (
                                        <span key={flag} className="tag urgency">{flag}</span>
                                    ))}
                                    {job.skills.slice(0, 3).map(skill => (
                                        <span key={skill} className="tag skill">{skill}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="selection-indicator">
                                {selectedJobs.find(j => j.id === job.id) ? '✅' : '○'}
                            </div>
                        </div>
                    ))}
                </div>

                {!isSearching && jobs.length === 0 && (
                    <div className="empty-search-state">
                        <div className="icon-large">🔭</div>
                        <h3>Ready to Discover</h3>
                        <p>Configure your preferences and start the engine</p>
                    </div>
                )}
            </div>
        </div>
    );
}
