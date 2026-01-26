/**
 * Opportunity Scoring Algorithm
 * Scores job opportunities based on skill match, urgency, salary, and other factors
 */

/**
 * Calculate the match between job requirements and user skills
 * @param {string[]} requirements - Job requirement keywords
 * @param {object} userSkills - User skills object with technical, soft, languages
 * @returns {number} - Score between 0 and 100
 */
export function calculateSkillMatch(requirements, userSkills) {
    if (!requirements || requirements.length === 0) return 50;

    const allUserSkills = [
        ...(userSkills.technical || []),
        ...(userSkills.soft || []),
        ...(userSkills.languages || [])
    ].map(s => s.toLowerCase());

    const requirementsLower = requirements.map(r => r.toLowerCase());

    let matchCount = 0;
    for (const req of requirementsLower) {
        if (allUserSkills.some(skill =>
            skill.includes(req) || req.includes(skill)
        )) {
            matchCount++;
        }
    }

    return Math.round((matchCount / requirements.length) * 100);
}

/**
 * Calculate days since a given date
 * @param {string|Date} date - The date to calculate from
 * @returns {number} - Number of days since the date
 */
export function daysSince(date) {
    if (!date) return Infinity;
    const then = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - then);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate salary alignment score
 * @param {object} jobSalary - Job salary range {min, max}
 * @param {object} userExpectations - User salary expectations {min, max}
 * @returns {number} - Score between 0 and 20
 */
export function calculateSalaryFit(jobSalary, userExpectations) {
    if (!jobSalary || !userExpectations) return 10; // Neutral score if no data

    const jobMid = (jobSalary.min + jobSalary.max) / 2;
    const userMid = (userExpectations.min + userExpectations.max) / 2;

    // Perfect match if job salary is within 20% of user expectation
    const ratio = jobMid / userMid;

    if (ratio >= 0.8 && ratio <= 1.3) {
        return 20; // Great fit
    } else if (ratio >= 0.6 && ratio <= 1.5) {
        return 15; // Acceptable
    } else if (ratio < 0.6) {
        return 5; // Too low
    } else {
        return 18; // Higher than expected (good!)
    }
}

/**
 * Main opportunity scoring function
 * @param {object} job - Job opportunity object
 * @param {object} company - Company information
 * @param {object} userProfile - User profile with skills and preferences
 * @returns {number} - Score between 0 and 100
 */
export function scoreOpportunity(job, company, userProfile) {
    let score = 0;

    // Base compatibility (0-40 points)
    const skillMatch = calculateSkillMatch(
        job.requirements || [],
        userProfile.skills || {}
    );
    score += skillMatch * 0.4;

    // Urgency multipliers (0-30 points)
    if (company?.fundingDate && daysSince(company.fundingDate) < 30) {
        score += 30; // Just raised funding
    } else if (company?.fundingDate && daysSince(company.fundingDate) < 60) {
        score += 20; // Recently raised funding
    }

    if (job.postedDate && daysSince(job.postedDate) < 3) {
        score += 20; // Freshly posted
    } else if (job.postedDate && daysSince(job.postedDate) < 7) {
        score += 10; // Recently posted
    }

    if (company?.isGitHubTrending || company?.isProductHuntTop10) {
        score += 25; // High momentum
    }

    // Salary alignment (0-20 points)
    const salaryScore = calculateSalaryFit(
        job.salary,
        userProfile.salaryExpectations
    );
    score += salaryScore;

    // Location/remote preference (0-10 points)
    if (job.isRemote && userProfile.workPreference === 'remote') {
        score += 10;
    } else if (job.isHybrid && userProfile.workPreference === 'hybrid') {
        score += 8;
    } else if (!job.isRemote && userProfile.workPreference === 'onsite') {
        score += 10;
    }

    // Competition level (penalty)
    if (job.applicantCount > 200) {
        score *= 0.7; // High competition
    } else if (job.applicantCount > 100) {
        score *= 0.85; // Medium competition
    }

    return Math.min(Math.round(score), 100);
}

/**
 * Get score category for styling
 * @param {number} score - The opportunity score
 * @returns {string} - 'high', 'medium', or 'low'
 */
export function getScoreCategory(score) {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
}

/**
 * Get urgency flags for an opportunity
 * @param {object} job - Job opportunity
 * @param {object} company - Company information
 * @returns {string[]} - Array of urgency flag strings
 */
export function getUrgencyFlags(job, company) {
    const flags = [];

    if (company?.fundingDate && daysSince(company.fundingDate) < 30) {
        flags.push(`Raised funding ${daysSince(company.fundingDate)} days ago`);
    }

    if (job.postedDate && daysSince(job.postedDate) < 3) {
        flags.push('Posted in last 3 days');
    }

    if (company?.isGitHubTrending) {
        flags.push('Trending on GitHub');
    }

    if (company?.isProductHuntTop10) {
        flags.push('Top 10 on Product Hunt');
    }

    return flags;
}
