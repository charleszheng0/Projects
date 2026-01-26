/**
 * Company Pattern Detection
 * Detects hiring patterns, growth signals, and opportunities
 */

/**
 * Detect company hiring patterns
 * @param {object} company - Company information
 * @param {object[]} recentActivity - Recent hiring activity data
 * @returns {object} - Detected patterns
 */
export function detectCompanyPatterns(company, recentActivity = []) {
    const patterns = {
        reverseJobOpportunity: false,
        hiringSpree: false,
        highTurnover: false,
        scalingFast: false,
        gapOpportunity: null,
        recentHires: 0,
        momentum: 'stable'
    };

    // Analyze recent hires
    const recentHiresCount = recentActivity.filter(a =>
        a.type === 'hire' && daysSince(a.date) < 30
    ).length;

    patterns.recentHires = recentHiresCount;

    if (recentHiresCount > 5) {
        patterns.hiringSpree = true;
        patterns.scalingFast = true;
        patterns.momentum = 'high';
    } else if (recentHiresCount > 2) {
        patterns.momentum = 'growing';
    }

    // Detect role gaps
    const roleTypes = categorizeRoles(recentActivity.filter(a => a.type === 'hire'));
    const gaps = identifyGaps(roleTypes);

    if (gaps.length > 0) {
        patterns.reverseJobOpportunity = true;
        patterns.gapOpportunity = gaps[0];
    }

    // Detect high turnover (more departures than hires)
    const departures = recentActivity.filter(a =>
        a.type === 'departure' && daysSince(a.date) < 90
    ).length;

    if (departures > recentHiresCount) {
        patterns.highTurnover = true;
        patterns.momentum = 'concerning';
    }

    return patterns;
}

/**
 * Categorize roles by department/type
 * @param {object[]} hires - Recent hire activity
 * @returns {object} - Categorized roles
 */
export function categorizeRoles(hires) {
    const categories = {
        engineering: 0,
        devops: 0,
        design: 0,
        product: 0,
        marketing: 0,
        sales: 0,
        hr: 0,
        other: 0
    };

    for (const hire of hires) {
        const title = (hire.title || '').toLowerCase();

        if (title.includes('engineer') || title.includes('developer') || title.includes('programmer')) {
            categories.engineering++;
        } else if (title.includes('devops') || title.includes('sre') || title.includes('infrastructure')) {
            categories.devops++;
        } else if (title.includes('design') || title.includes('ux') || title.includes('ui')) {
            categories.design++;
        } else if (title.includes('product') || title.includes('pm')) {
            categories.product++;
        } else if (title.includes('marketing') || title.includes('growth')) {
            categories.marketing++;
        } else if (title.includes('sales') || title.includes('account')) {
            categories.sales++;
        } else if (title.includes('hr') || title.includes('people') || title.includes('recruit')) {
            categories.hr++;
        } else {
            categories.other++;
        }
    }

    return categories;
}

/**
 * Identify gaps in hiring (missing roles)
 * @param {object} roleTypes - Categorized role counts
 * @returns {string[]} - List of potential gap roles
 */
export function identifyGaps(roleTypes) {
    const gaps = [];

    // If many engineers but no devops
    if (roleTypes.engineering >= 3 && roleTypes.devops === 0) {
        gaps.push('DevOps Engineer');
    }

    // If engineers but no product
    if (roleTypes.engineering >= 5 && roleTypes.product === 0) {
        gaps.push('Product Manager');
    }

    // If engineers but no design
    if (roleTypes.engineering >= 4 && roleTypes.design === 0) {
        gaps.push('UX Designer');
    }

    // If multiple roles but no HR
    const totalHires = Object.values(roleTypes).reduce((a, b) => a + b, 0);
    if (totalHires >= 10 && roleTypes.hr === 0) {
        gaps.push('HR Manager');
    }

    return gaps;
}

/**
 * Calculate company growth signals
 * @param {object} company - Company information
 * @returns {object} - Growth signals
 */
export function calculateGrowthSignals(company) {
    const signals = {
        score: 0,
        indicators: []
    };

    // Funding signals
    if (company?.fundingDate && daysSince(company.fundingDate) < 30) {
        signals.score += 30;
        signals.indicators.push({
            type: 'funding',
            text: `Raised ${company.fundingAmount || 'funding'} recently`,
            impact: 'high'
        });
    }

    // GitHub signals
    if (company?.isGitHubTrending) {
        signals.score += 25;
        signals.indicators.push({
            type: 'github',
            text: 'Trending on GitHub',
            impact: 'high'
        });
    }

    if (company?.githubStars > 1000) {
        signals.score += 15;
        signals.indicators.push({
            type: 'github',
            text: `${company.githubStars.toLocaleString()} GitHub stars`,
            impact: 'medium'
        });
    }

    // Product Hunt signals
    if (company?.isProductHuntTop10) {
        signals.score += 25;
        signals.indicators.push({
            type: 'product_hunt',
            text: 'Top 10 on Product Hunt',
            impact: 'high'
        });
    }

    // YC/Accelerator signals
    if (company?.isYCBacked) {
        signals.score += 20;
        signals.indicators.push({
            type: 'accelerator',
            text: 'Y Combinator backed',
            impact: 'high'
        });
    }

    // Team growth signals
    if (company?.employeeGrowth > 50) {
        signals.score += 15;
        signals.indicators.push({
            type: 'growth',
            text: `${company.employeeGrowth}% employee growth`,
            impact: 'medium'
        });
    }

    return signals;
}

/**
 * Identify competitor companies
 * @param {object} company - Target company
 * @param {string} industry - Industry to search
 * @returns {string[]} - List of competitor searches
 */
export function generateCompetitorSearches(company, industry) {
    const searches = [];
    const companyName = company?.name || '';

    if (companyName) {
        searches.push(`${companyName} competitors`);
        searches.push(`${companyName} alternatives`);
        searches.push(`companies like ${companyName}`);
    }

    if (industry) {
        searches.push(`top ${industry} startups hiring`);
        searches.push(`${industry} companies funding 2024`);
    }

    return searches;
}

/**
 * Analyze connection opportunities
 * @param {object} company - Target company
 * @param {object} userProfile - User profile
 * @returns {object} - Connection analysis
 */
export function analyzeConnectionOpportunities(company, userProfile) {
    const opportunities = {
        mutualConnections: [],
        sharedExperiences: [],
        networking: []
    };

    // Check for shared experiences (schools, previous companies)
    const userSchools = (userProfile.education || []).map(e => e.school?.toLowerCase());
    const userPrevCompanies = (userProfile.experiences || []).map(e => e.company?.toLowerCase());

    // This would normally search LinkedIn data
    opportunities.networking.push({
        type: 'school',
        suggestion: `Search for ${company?.name} employees from your alma mater`,
        template: `Hi [Name], I noticed we both attended ${userProfile.education?.[0]?.school}. I'm very interested in opportunities at ${company?.name}...`
    });

    opportunities.networking.push({
        type: 'industry',
        suggestion: 'Connect with people in similar roles',
        template: `Hi [Name], I came across your profile while researching ${company?.name}. I'd love to learn more about the engineering culture there...`
    });

    return opportunities;
}

function daysSince(date) {
    if (!date) return Infinity;
    const then = new Date(date);
    const now = new Date();
    return Math.ceil((now - then) / (1000 * 60 * 60 * 24));
}
