import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import UserProfileForm from './components/UserProfileForm'
import DiscoveryTab from './components/DiscoveryTab'
import OpportunitiesTab from './components/OpportunitiesTab'
import AppliedTab from './components/AppliedTab'
import AnalyticsTab from './components/AnalyticsTab'
import SettingsModal from './components/SettingsModal'
import { scoreOpportunity, getScoreCategory, getUrgencyFlags } from './utils/scoring'
import { generateTargetedResume, generateCoverLetter } from './utils/resumeGenerator'
import { detectCompanyPatterns, calculateGrowthSignals } from './utils/patterns'
import { RateLimiter, validateSettings } from './utils/validation'

// Initialize rate limiter
const rateLimiter = new RateLimiter(100, 60000);

// Sample data for demonstration
const sampleOpportunities = [
    {
        id: 'opp_1',
        title: 'Senior Software Engineer',
        company: {
            name: 'TechStartup AI',
            type: 'startup',
            logo: 'T',
            fundingDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            fundingAmount: '$15M',
            fundingRound: 'Series A',
            isGitHubTrending: true
        },
        description: 'We are looking for a senior engineer to lead our backend team. Experience with Python, AWS, and distributed systems required.',
        requirements: ['Python', 'AWS', 'Docker', 'PostgreSQL', 'Microservices', 'Leadership'],
        salary: { min: 180000, max: 220000 },
        isRemote: true,
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        applicationUrl: 'https://techstartup.ai/careers',
        applicantCount: 45
    },
    {
        id: 'opp_2',
        title: 'Full-Stack Developer',
        company: {
            name: 'GreenTech Solutions',
            type: 'scale-up',
            logo: 'G',
            fundingDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            fundingAmount: '$8M',
            fundingRound: 'Series A'
        },
        description: 'Join our mission to fight climate change. Looking for react and node developers.',
        requirements: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'GraphQL'],
        salary: { min: 140000, max: 180000 },
        isRemote: true,
        isHybrid: false,
        postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        applicationUrl: 'https://greentech.com/jobs',
        applicantCount: 78
    },
    {
        id: 'opp_3',
        title: 'Backend Engineer',
        company: {
            name: 'FinanceFlow',
            type: 'enterprise',
            logo: 'F'
        },
        description: 'Enterprise fintech company seeking backend engineers with Java experience.',
        requirements: ['Java', 'Spring Boot', 'Kafka', 'SQL', 'Kubernetes'],
        salary: { min: 160000, max: 200000 },
        isRemote: false,
        postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        applicationUrl: 'https://financeflow.io/careers',
        applicantCount: 156
    },
    {
        id: 'opp_4',
        title: 'Machine Learning Engineer',
        company: {
            name: 'AI Labs',
            type: 'startup',
            logo: 'A',
            isProductHuntTop10: true,
            isYCBacked: true
        },
        description: 'Building the future of AI. Need ML engineers with PyTorch experience.',
        requirements: ['Python', 'PyTorch', 'TensorFlow', 'Machine Learning', 'Deep Learning', 'NLP'],
        salary: { min: 200000, max: 280000 },
        isRemote: true,
        postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        applicationUrl: 'https://ailabs.com/careers',
        applicantCount: 89
    }
];

const sampleApplications = [
    {
        id: 'app_1',
        opportunityId: 'opp_1',
        title: 'Senior Software Engineer',
        company: 'TechStartup AI',
        appliedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'viewed',
        timeline: [
            { step: 'Applied', completed: true, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
            { step: 'Viewed', completed: true, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
            { step: 'Response', completed: false },
            { step: 'Interview', completed: false }
        ]
    },
    {
        id: 'app_2',
        opportunityId: 'opp_2',
        title: 'Full-Stack Developer',
        company: 'GreenTech Solutions',
        appliedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'responded',
        timeline: [
            { step: 'Applied', completed: true, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            { step: 'Viewed', completed: true, date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
            { step: 'Response', completed: true, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            { step: 'Interview', completed: false }
        ]
    }
];

const defaultProfile = {
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    github: '',
    portfolio: '',
    targetRoles: ['Software Engineer'],
    targetIndustries: ['AI/ML', 'FinTech'],
    salaryExpectations: { min: 150000, max: 200000 },
    workPreference: 'remote',
    employmentType: 'full-time',
    experiences: [],
    skills: {
        technical: ['Python', 'JavaScript', 'React', 'AWS', 'Docker'],
        soft: ['Leadership', 'Communication', 'Problem Solving'],
        languages: ['English (Native)']
    },
    education: [],
    projects: [],
    searchPreferences: {
        keywords: [],
        excludeKeywords: [],
        companySize: ['startup', 'scale-up'],
        fundingStage: ['Seed', 'Series A', 'Series B'],
        applicationFrequency: 'moderate'
    }
};

const defaultSettings = {
    autoApply: false,
    autoApplyThreshold: 80,
    searchFrequency: 'moderate',
    maxApplicationsPerDay: 30,
    requireReview: true,
    notificationsEnabled: true
};

function App() {
    // State management
    const [activeTab, setActiveTab] = useState('discovery');
    const [profileComplete, setProfileComplete] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Data state
    const [userProfile, setUserProfile] = useState(defaultProfile);
    const [opportunities, setOpportunities] = useState([]);
    const [applications, setApplications] = useState(sampleApplications);
    const [searchHistory, setSearchHistory] = useState([]);
    const [resumeVariants, setResumeVariants] = useState({});
    const [coverLetters, setCoverLetters] = useState({});
    const [settings, setSettings] = useState(defaultSettings);

    // Search state
    const [isSearching, setIsSearching] = useState(false);
    const [searchLog, setSearchLog] = useState([]);

    // Analytics state
    const [analytics, setAnalytics] = useState({
        totalSearched: 0,
        totalApplied: 2,
        responseRate: 50,
        interviewRate: 0,
        avgScoreApplied: 76,
        topPerformingVariant: 'Tech Startup - Casual Tone',
        bestChannel: 'Direct email to founders',
        bestTiming: 'Tuesday 10am'
    });

    // Initialize with sample data after profile is complete
    useEffect(() => {
        if (profileComplete) {
            // Score and add sample opportunities
            const scoredOpportunities = sampleOpportunities.map(opp => {
                const score = scoreOpportunity(opp, opp.company, userProfile);
                const urgencyFlags = getUrgencyFlags(opp, opp.company);
                const patterns = detectCompanyPatterns(opp.company, []);
                const growthSignals = calculateGrowthSignals(opp.company);

                return {
                    ...opp,
                    score,
                    scoreCategory: getScoreCategory(score),
                    urgencyFlags,
                    patterns,
                    growthSignals
                };
            });

            // Sort by score
            scoredOpportunities.sort((a, b) => b.score - a.score);
            setOpportunities(scoredOpportunities);
            setAnalytics(prev => ({ ...prev, totalSearched: scoredOpportunities.length }));
        }
    }, [profileComplete, userProfile]);

    // Log search activity
    const addSearchLog = useCallback((message, type = 'info') => {
        setSearchLog(prev => [
            ...prev.slice(-50), // Keep last 50 entries
            {
                id: Date.now(),
                time: new Date().toLocaleTimeString(),
                message,
                type
            }
        ]);
    }, []);

    // Start search
    const handleStartSearch = useCallback(async () => {
        if (isSearching) return;

        setIsSearching(true);
        addSearchLog('Starting job search...', 'info');

        // Simulate search progress
        const sources = [
            'LinkedIn Jobs',
            'Indeed',
            'AngelList',
            'Y Combinator Jobs',
            'GitHub Trending',
            'Product Hunt',
            'TechCrunch Funding',
            'Company Careers Pages'
        ];

        for (const source of sources) {
            await new Promise(resolve => setTimeout(resolve, 800));
            addSearchLog(`Searching ${source}...`, 'info');

            // Simulate finding jobs
            const found = Math.floor(Math.random() * 15) + 5;
            addSearchLog(`Found ${found} opportunities on ${source}`, 'success');
        }

        addSearchLog('Search complete! Analyzing opportunities...', 'success');
        setIsSearching(false);

        setAnalytics(prev => ({
            ...prev,
            totalSearched: prev.totalSearched + sources.length * 10
        }));
    }, [isSearching, addSearchLog]);

    // Stop search
    const handleStopSearch = useCallback(() => {
        setIsSearching(false);
        addSearchLog('Search stopped by user', 'warning');
    }, [addSearchLog]);

    // Generate materials for an opportunity
    const handleGenerateMaterials = useCallback((opportunity) => {
        const patterns = opportunity.patterns || detectCompanyPatterns(opportunity.company, []);

        // Generate resume
        const resume = generateTargetedResume(userProfile, opportunity);
        setResumeVariants(prev => ({
            ...prev,
            [opportunity.id]: resume
        }));

        // Generate cover letter
        const coverLetter = generateCoverLetter(userProfile, opportunity, opportunity.company, patterns);
        setCoverLetters(prev => ({
            ...prev,
            [opportunity.id]: coverLetter
        }));

        return { resume, coverLetter };
    }, [userProfile]);

    // Apply to an opportunity
    const handleApply = useCallback((opportunity) => {
        const canApply = rateLimiter.canApply();

        if (!canApply.canProceed) {
            alert(`Cannot apply: ${canApply.reason}. Wait ${Math.ceil(canApply.waitTime / 1000)} seconds.`);
            return;
        }

        // Generate materials if not already done
        if (!resumeVariants[opportunity.id]) {
            handleGenerateMaterials(opportunity);
        }

        // Create application record
        const application = {
            id: `app_${Date.now()}`,
            opportunityId: opportunity.id,
            title: opportunity.title,
            company: opportunity.company.name,
            appliedDate: new Date().toISOString(),
            status: 'sent',
            timeline: [
                { step: 'Applied', completed: true, date: new Date() },
                { step: 'Viewed', completed: false },
                { step: 'Response', completed: false },
                { step: 'Interview', completed: false }
            ]
        };

        setApplications(prev => [application, ...prev]);
        rateLimiter.recordApplication();

        // Update analytics
        setAnalytics(prev => ({
            ...prev,
            totalApplied: prev.totalApplied + 1
        }));

        addSearchLog(`Applied to ${opportunity.title} at ${opportunity.company.name}`, 'success');
    }, [resumeVariants, handleGenerateMaterials, addSearchLog]);

    // Skip an opportunity
    const handleSkip = useCallback((opportunityId) => {
        setOpportunities(prev => prev.filter(opp => opp.id !== opportunityId));
        addSearchLog('Opportunity skipped', 'info');
    }, [addSearchLog]);

    // Save profile
    const handleSaveProfile = useCallback((profile) => {
        setUserProfile(profile);
        setProfileComplete(true);
    }, []);

    // Update settings
    const handleSaveSettings = useCallback((newSettings) => {
        const validated = validateSettings(newSettings);
        setSettings(validated);
        setShowSettings(false);
    }, []);

    // Calculate quick stats
    const quickStats = {
        jobsFound: opportunities.length,
        applicationsSent: applications.length,
        responses: applications.filter(a =>
            a.status === 'responded' || a.status === 'interview'
        ).length,
        interviews: applications.filter(a => a.status === 'interview').length
    };

    // Priority alerts
    const priorityAlerts = opportunities
        .filter(opp => opp.urgencyFlags && opp.urgencyFlags.length > 0)
        .slice(0, 3)
        .map(opp => ({
            id: opp.id,
            title: opp.company.name,
            subtitle: opp.urgencyFlags[0],
            type: opp.company.fundingDate ? 'funding' : 'trending'
        }));

    // Recent activity
    const recentActivity = [
        ...applications.slice(0, 3).map(app => ({
            id: app.id,
            icon: '📤',
            text: `Applied to ${app.title} at ${app.company}`,
            time: new Date(app.appliedDate).toLocaleDateString(),
            type: 'application'
        })),
        ...searchLog.slice(-2).map(log => ({
            id: log.id,
            icon: log.type === 'success' ? '✅' : '🔍',
            text: log.message,
            time: log.time,
            type: log.type
        }))
    ].slice(0, 5);

    // If profile not complete, show profile form
    if (!profileComplete) {
        return (
            <div className="app-container">
                <Header
                    searchStatus="inactive"
                    userName=""
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    onOpenSettings={() => setShowSettings(true)}
                />
                <div className="app-main">
                    <div className="main-content" style={{ marginLeft: 0 }}>
                        <UserProfileForm
                            profile={userProfile}
                            onSave={handleSaveProfile}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Header
                searchStatus={isSearching ? 'searching' : 'active'}
                userName={userProfile.name}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                onOpenSettings={() => setShowSettings(true)}
            />

            <div className="app-main">
                <Sidebar
                    isOpen={sidebarOpen}
                    quickStats={quickStats}
                    priorityAlerts={priorityAlerts}
                    recentActivity={recentActivity}
                    onAlertClick={(id) => {
                        const opp = opportunities.find(o => o.id === id);
                        if (opp) {
                            setActiveTab('opportunities');
                        }
                    }}
                />

                <main className={`main-content ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
                    <div className="tabs-container">
                        <nav className="tabs-nav">
                            <button
                                className={`tab-button ${activeTab === 'discovery' ? 'active' : ''}`}
                                onClick={() => setActiveTab('discovery')}
                            >
                                <span className="tab-icon">🔍</span>
                                <span>Discovery</span>
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'opportunities' ? 'active' : ''}`}
                                onClick={() => setActiveTab('opportunities')}
                            >
                                <span className="tab-icon">💼</span>
                                <span>Opportunities</span>
                                {opportunities.length > 0 && (
                                    <span className="tab-badge">{opportunities.length}</span>
                                )}
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'applied' ? 'active' : ''}`}
                                onClick={() => setActiveTab('applied')}
                            >
                                <span className="tab-icon">📤</span>
                                <span>Applied</span>
                                {applications.length > 0 && (
                                    <span className="tab-badge">{applications.length}</span>
                                )}
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
                                onClick={() => setActiveTab('analytics')}
                            >
                                <span className="tab-icon">📊</span>
                                <span>Analytics</span>
                            </button>
                        </nav>

                        <div className="tab-content">
                            {activeTab === 'discovery' && (
                                <DiscoveryTab
                                    isSearching={isSearching}
                                    searchLog={searchLog}
                                    opportunities={opportunities}
                                    userProfile={userProfile}
                                    onStartSearch={handleStartSearch}
                                    onStopSearch={handleStopSearch}
                                    onViewOpportunity={(id) => {
                                        setActiveTab('opportunities');
                                    }}
                                />
                            )}

                            {activeTab === 'opportunities' && (
                                <OpportunitiesTab
                                    opportunities={opportunities}
                                    resumeVariants={resumeVariants}
                                    coverLetters={coverLetters}
                                    onGenerateMaterials={handleGenerateMaterials}
                                    onApply={handleApply}
                                    onSkip={handleSkip}
                                />
                            )}

                            {activeTab === 'applied' && (
                                <AppliedTab
                                    applications={applications}
                                />
                            )}

                            {activeTab === 'analytics' && (
                                <AnalyticsTab
                                    analytics={analytics}
                                    applications={applications}
                                />
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {showSettings && (
                <SettingsModal
                    settings={settings}
                    onSave={handleSaveSettings}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </div>
    );
}

export default App
