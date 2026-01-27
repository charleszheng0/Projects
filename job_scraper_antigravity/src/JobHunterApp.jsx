import React, { useState } from 'react';
import JobSearchView from './components/JobSearchView';
import ResumeOptimizerApp from './components/ResumeOptimizerApp';
import './ResumeOptimizer.css'; // Re-use styles
import './JobHunter.css'; // New styles

function JobHunterApp() {
    const [currentView, setCurrentView] = useState('home');
    const [userProfile, setUserProfile] = useState({
        name: 'Candidate',
        targetRoles: ['Software Engineer'],
        skills: { technical: ['React', 'Node.js'] }
    }); // Mock profile for now

    const [autoApplyQueue, setAutoApplyQueue] = useState([]);

    const handleApply = (selectedJobs) => {
        setAutoApplyQueue(selectedJobs);
        setCurrentView('autoapply');
    };

    return (
        <div className="job-hunter-app">
            <nav className="main-nav">
                <div className="nav-brand">🤖 Job Hunter</div>
                <div className="nav-links">
                    <button className={currentView === 'home' ? 'active' : ''} onClick={() => setCurrentView('home')}>Home</button>
                    <button className={currentView === 'search' ? 'active' : ''} onClick={() => setCurrentView('search')}>Search</button>
                    <button className={currentView === 'autoapply' ? 'active' : ''} onClick={() => setCurrentView('autoapply')}>Auto-Apply {autoApplyQueue.length > 0 && `(${autoApplyQueue.length})`}</button>
                    <button className={currentView === 'optimizer' ? 'active' : ''} onClick={() => setCurrentView('optimizer')}>Resume Tool</button>
                    <button className={currentView === 'settings' ? 'active' : ''} onClick={() => setCurrentView('settings')}>Settings</button>
                </div>
            </nav>

            <main className="main-viewport">
                {currentView === 'home' && (
                    <div className="dashboard-view fade-in">
                        <h1>Welcome back, {userProfile.name}</h1>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>Applications Sent</h3>
                                <div className="value">0</div>
                            </div>
                            <div className="stat-card">
                                <h3>Response Rate</h3>
                                <div className="value">0%</div>
                            </div>
                            <div className="stat-card">
                                <h3>Jobs Discovered</h3>
                                <div className="value">0</div>
                            </div>
                        </div>

                        <div className="action-buttons-large">
                            <button className="primary-button large" onClick={() => setCurrentView('search')}>
                                Start Job Search
                            </button>
                            <button className="secondary-button large" onClick={() => setCurrentView('optimizer')}>
                                Optimize Resume
                            </button>
                        </div>
                    </div>
                )}

                {currentView === 'search' && (
                    <JobSearchView userProfile={userProfile} onApply={handleApply} />
                )}

                {currentView === 'autoapply' && (
                    <div className="auto-apply-placeholder fade-in">
                        <h2>Auto-Apply Queue</h2>
                        <p>Queue contains {autoApplyQueue.length} jobs.</p>
                        {/* Will implement full view next phase */}
                        <p>Coming up: Automated application process...</p>
                    </div>
                )}

                {currentView === 'optimizer' && (
                    <ResumeOptimizerApp />
                )}

                {currentView === 'settings' && (
                    <div className="settings-placeholder fade-in">
                        <h2>Settings</h2>
                        <p>Profile and API configuration.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default JobHunterApp;
