/**
 * Job Search Service
 * Orchestrates multi-source web searches for job opportunities
 * NOTE: Since we cannot perform actual scraped searches in browser efficiently without a proxy,
 * we will simulate the behavior or use available APIs if configured. 
 * For this "Autonomous" feature, we'll implement the logic assuming we can fetch results.
 */

// Mock data generator for demonstration when real search isn't available
function generateMockJobs(roles, location) {
    const companies = ['TechCorp', 'DataSystems', 'CloudNet', 'AI Stream', 'FutureSoft', 'DevOps Inc'];
    const titles = roles.length > 0 ? roles : ['Software Engineer', 'Product Manager', 'Data Scientist'];

    return Array.from({ length: 5 }).map((_, i) => ({
        id: `job-${Date.now()}-${i}`,
        title: titles[Math.floor(Math.random() * titles.length)],
        company: companies[Math.floor(Math.random() * companies.length)],
        location: Math.random() > 0.5 ? 'Remote' : location || 'New York, NY',
        isRemote: Math.random() > 0.3,
        postedDate: 'Posted 2 days ago',
        description: 'We are looking for a talented engineer to join our growing team. You will work on cutting-edge technologies and help scale our platform to millions of users.',
        salary: Math.random() > 0.5 ? '$120k - $160k' : null,
        skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
        applyUrl: 'https://example.com/apply',
        source: 'LinkedIn'
    }));
}

/**
 * Execute a search query
 */
export async function searchJobs(config) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In a real implementation, this would call a backend scraper or API
    // For this standalone client-side app, we'll return sophisticated mock data
    // tailored to the user's search config to demonstrate the UI/UX

    return generateMockJobs(config.targetRoles, config.location);
}

/**
 * Calculate match score for a job based on user profile
 */
export function calculateMatchScore(job, userProfile) {
    let score = 0;

    // 1. Skill Match (40%)
    const userSkills = new Set(
        (userProfile.skills?.technical?.flat() || [])
            .concat(userProfile.skills?.soft || [])
            .map(s => s.toLowerCase())
    );

    const jobSkills = job.skills || [];
    const matchedSkills = jobSkills.filter(s => userSkills.has(s.toLowerCase()));

    const skillScore = jobSkills.length ? (matchedSkills.length / jobSkills.length) * 40 : 20;
    score += skillScore;

    // 2. Location (20%)
    if (job.isRemote && (userProfile.remote || userProfile.workPreference?.includes('remote'))) {
        score += 20;
    } else if (job.location?.includes(userProfile.location)) {
        score += 20;
    }

    // 3. Role Title Match (20%)
    const titleMatch = (userProfile.targetRoles || []).some(role =>
        job.title.toLowerCase().includes(role.toLowerCase())
    );
    if (titleMatch) score += 20;

    // 4. Random variability for demo (20%)
    score += Math.floor(Math.random() * 20);

    return Math.min(Math.round(score), 100);
}

/**
 * Analyze urgency flags
 */
export function analyzeUrgency(job) {
    const flags = [];
    if (job.postedDate?.includes('today') || job.postedDate?.includes('hour')) flags.push('🆕 Fresh');
    if (job.description?.toLowerCase().includes('urgent')) flags.push('⚡ Urgent');
    return flags;
}
