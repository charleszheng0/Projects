import React, { useState } from 'react';

export default function ResumeComparison({ original, optimized }) {
    const [activeTab, setActiveTab] = useState('optimized'); // 'optimized', 'original', 'changes'

    const optimizedData = optimized.optimizedResume;

    return (
        <div className="comparison-view">
            <div className="view-controls">
                <button
                    className={`view-btn ${activeTab === 'optimized' ? 'active' : ''}`}
                    onClick={() => setActiveTab('optimized')}
                >
                    Optimized Resume
                </button>
                <button
                    className={`view-btn ${activeTab === 'original' ? 'active' : ''}`}
                    onClick={() => setActiveTab('original')}
                >
                    Original Resume
                </button>
                <button
                    className={`view-btn ${activeTab === 'changes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('changes')}
                >
                    Analysis & Changes
                </button>
            </div>

            <div className="resume-preview-container">
                {activeTab === 'optimized' && (
                    <div className="resume-paper fade-in">
                        <div className="resume-header">
                            <h1>{optimizedData.personalInfo.name}</h1>
                            <div className="contact-info">
                                {[
                                    optimizedData.personalInfo.email,
                                    optimizedData.personalInfo.phone,
                                    optimizedData.personalInfo.location
                                ].filter(Boolean).join(' | ')}
                            </div>
                        </div>

                        <div className="resume-section">
                            <h3>Professional Summary</h3>
                            <p>{optimizedData.summary}</p>
                        </div>

                        <div className="resume-section">
                            <h3>Technical Skills</h3>
                            <div className="skills-list">
                                {Object.entries(optimizedData.skills.technical || {}).map(([category, skills]) => (
                                    skills && skills.length > 0 && (
                                        <div key={category} className="skill-row">
                                            <strong>{category.charAt(0).toUpperCase() + category.slice(1)}:</strong> {skills.join(', ')}
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>

                        <div className="resume-section">
                            <h3>Experience</h3>
                            {optimizedData.experiences.map((exp, i) => (
                                <div key={i} className="job-entry">
                                    <div className="job-header">
                                        <strong>{exp.title}</strong>
                                        <span>{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <div className="job-sub">
                                        {exp.company} | {exp.location}
                                    </div>
                                    <ul>
                                        {exp.responsibilities?.map((r, idx) => <li key={`r-${idx}`}>{r}</li>)}
                                        {exp.achievements?.map((a, idx) => <li key={`a-${idx}`}>{typeof a === 'string' ? a : a.text}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="resume-section">
                            <h3>Education</h3>
                            {optimizedData.education.map((edu, i) => (
                                <div key={i} className="edu-entry">
                                    <div><strong>{edu.school}</strong> - {edu.degree}</div>
                                    <div>{edu.graduationDate || edu.year}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'original' && (
                    <div className="resume-paper fade-in original-mode">
                        <pre className="raw-text-preview" style={{ whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(original, null, 2)}
                        </pre>
                    </div>
                )}

                {activeTab === 'changes' && (
                    <div className="analysis-panel fade-in">
                        <h3>Optimization Report</h3>

                        <div className="score-card">
                            <div className="score-circle">
                                <span className="score-val">{optimized.optimizationReport?.atsScore || 'N/A'}</span>
                                <span className="score-label">ATS Score</span>
                            </div>
                            <div className="score-metrics">
                                <div className="metric">
                                    <span>Keyword Match:</span>
                                    <strong>{optimized.optimizationReport?.keywordMatchScore}/100</strong>
                                </div>
                                <div className="metric">
                                    <span>Skills Covered:</span>
                                    <strong>{optimized.optimizationReport?.matchAnalysis?.requiredSkillsCovered}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="report-section">
                            <h4>Changes Applied</h4>
                            <ul>
                                {optimized.optimizationReport?.changesApplied?.map((change, i) => (
                                    <li key={i}>✅ {change}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="report-section">
                            <h4>Issues Fixed</h4>
                            <ul>
                                {optimized.optimizationReport?.atsIssuesFixed?.map((issue, i) => (
                                    <li key={i}>🔧 {issue}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
