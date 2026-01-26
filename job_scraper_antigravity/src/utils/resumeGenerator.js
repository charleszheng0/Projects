/**
 * Resume and Cover Letter Generator
 * Dynamically generates targeted resumes and cover letters based on job requirements
 */

/**
 * Extract keywords from job description
 * @param {string} description - Job description text
 * @returns {string[]} - Array of extracted keywords
 */
export function extractKeywords(description) {
    if (!description) return [];

    // Common technical keywords to look for
    const techKeywords = [
        'javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'python',
        'java', 'golang', 'rust', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
        'sql', 'nosql', 'mongodb', 'postgresql', 'redis', 'graphql', 'rest',
        'agile', 'scrum', 'ci/cd', 'git', 'linux', 'microservices', 'api',
        'machine learning', 'ai', 'data science', 'cloud', 'devops', 'security'
    ];

    const descLower = description.toLowerCase();
    const found = [];

    for (const keyword of techKeywords) {
        if (descLower.includes(keyword)) {
            found.push(keyword);
        }
    }

    return found;
}

/**
 * Parse required skills from job requirements
 * @param {string} requirements - Job requirements text
 * @returns {string[]} - Array of required skills
 */
export function parseRequiredSkills(requirements) {
    if (!requirements) return [];

    // Split by common delimiters
    const skills = requirements
        .split(/[,;•\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && s.length < 50);

    return skills;
}

/**
 * Calculate keyword overlap between two arrays
 * @param {string[]} keywords1 - First keyword array
 * @param {string[]} keywords2 - Second keyword array
 * @returns {boolean} - Whether there is overlap
 */
export function hasKeywordOverlap(keywords1, keywords2) {
    if (!keywords1 || !keywords2) return false;

    const set1 = new Set(keywords1.map(k => k.toLowerCase()));
    return keywords2.some(k => set1.has(k.toLowerCase()));
}

/**
 * Calculate relevance score for an experience
 * @param {object} experience - Experience object
 * @param {string[]} targetKeywords - Keywords from job posting
 * @returns {number} - Relevance score 0-100
 */
export function calculateRelevance(experience, targetKeywords) {
    if (!experience || !targetKeywords || targetKeywords.length === 0) return 50;

    const expKeywords = [
        ...(experience.skills || []),
        ...((experience.achievements || []).flatMap(a => a.keywords || []))
    ].map(k => k.toLowerCase());

    const targetLower = targetKeywords.map(k => k.toLowerCase());

    let matchCount = 0;
    for (const target of targetLower) {
        if (expKeywords.some(k => k.includes(target) || target.includes(k))) {
            matchCount++;
        }
    }

    return Math.min(Math.round((matchCount / targetKeywords.length) * 100), 100);
}

/**
 * Find the best alternative title for a position
 * @param {object} experience - Experience with alternativeTitles
 * @param {string} targetTitle - Target job title
 * @returns {string|null} - Best matching title or null
 */
export function findBestTitleVariant(experience, targetTitle) {
    if (!experience.alternativeTitles || !targetTitle) return null;

    const targetLower = targetTitle.toLowerCase();

    // Check if any alternative title matches better
    for (const altTitle of experience.alternativeTitles) {
        if (targetLower.includes(altTitle.toLowerCase()) ||
            altTitle.toLowerCase().includes(targetLower.split(' ')[0])) {
            return altTitle;
        }
    }

    return null;
}

/**
 * Reorder skills by relevance to job requirements
 * @param {object} skills - User skills object
 * @param {string[]} requiredSkills - Required skills from job
 * @returns {object} - Reordered skills object
 */
export function reorderSkillsByRelevance(skills, requiredSkills) {
    if (!skills || !requiredSkills) return skills;

    const requiredLower = new Set(requiredSkills.map(s => s.toLowerCase()));

    const sortByRelevance = (arr) => {
        return [...arr].sort((a, b) => {
            const aMatch = requiredLower.has(a.toLowerCase()) ? 1 : 0;
            const bMatch = requiredLower.has(b.toLowerCase()) ? 1 : 0;
            return bMatch - aMatch;
        });
    };

    return {
        technical: sortByRelevance(skills.technical || []),
        soft: sortByRelevance(skills.soft || []),
        languages: skills.languages || []
    };
}

/**
 * Determine resume format based on company type
 * @param {string} companyType - Type of company (startup, enterprise, etc)
 * @returns {string} - Format type ('modern', 'traditional', 'creative')
 */
export function determineResumeFormat(companyType) {
    switch (companyType?.toLowerCase()) {
        case 'startup':
        case 'scale-up':
            return 'modern';
        case 'enterprise':
        case 'corporate':
            return 'traditional';
        case 'creative':
        case 'design':
            return 'creative';
        default:
            return 'modern';
    }
}

/**
 * Determine tone for cover letter
 * @param {string} companyType - Type of company
 * @returns {string} - Tone ('casual', 'formal', 'confident')
 */
export function determineTone(companyType) {
    switch (companyType?.toLowerCase()) {
        case 'startup':
        case 'scale-up':
            return 'casual';
        case 'enterprise':
        case 'corporate':
            return 'formal';
        default:
            return 'confident';
    }
}

/**
 * Adapt an experience for a specific job posting
 * @param {object} experience - Original experience
 * @param {string[]} targetKeywords - Keywords from job
 * @param {string[]} requiredSkills - Required skills from job
 * @returns {object} - Adapted experience
 */
export function adaptExperience(experience, targetKeywords, requiredSkills) {
    const relevanceScore = calculateRelevance(experience, targetKeywords);

    // Select most relevant achievements
    const relevantAchievements = (experience.achievements || [])
        .filter(ach => hasKeywordOverlap(ach.keywords || [], targetKeywords))
        .slice(0, 3);

    // If not enough relevant achievements, add top ones
    if (relevantAchievements.length < 2 && experience.achievements) {
        const remaining = experience.achievements
            .filter(a => !relevantAchievements.includes(a))
            .slice(0, 2 - relevantAchievements.length);
        relevantAchievements.push(...remaining);
    }

    return {
        ...experience,
        achievements: relevantAchievements,
        relevanceScore
    };
}

/**
 * Generate a personalized summary based on job and company
 * @param {object} userProfile - User profile
 * @param {object} job - Job posting
 * @param {object} company - Company information
 * @returns {string} - Personalized summary
 */
export function generatePersonalizedSummary(userProfile, job, company) {
    const yearsExp = userProfile.experiences?.length
        ? Math.max(...userProfile.experiences.map(e => {
            const years = new Date().getFullYear() - parseInt(e.startDate?.split('-')[0] || new Date().getFullYear());
            return years;
        }))
        : 5;

    const topSkills = (userProfile.skills?.technical || []).slice(0, 3).join(', ');
    const targetRole = job.title || userProfile.targetRoles?.[0] || 'Software Engineer';

    return `Experienced ${targetRole} with ${yearsExp}+ years of expertise in ${topSkills}. ` +
        `Passionate about building scalable solutions and driving technical excellence. ` +
        `Seeking to contribute to ${company?.name || 'an innovative team'}'s mission and growth.`;
}

/**
 * Generate targeted resume object
 * @param {object} userProfile - User profile
 * @param {object} jobPosting - Job posting
 * @returns {object} - Generated resume object
 */
export function generateTargetedResume(userProfile, jobPosting) {
    const jobKeywords = extractKeywords(jobPosting.description || '');
    const requiredSkills = parseRequiredSkills(jobPosting.requirements || '');

    // Adapt and sort experiences by relevance
    const selectedExperiences = (userProfile.experiences || [])
        .map(exp => adaptExperience(exp, jobKeywords, requiredSkills))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);

    // Check for better title variants
    selectedExperiences.forEach(exp => {
        const betterTitle = findBestTitleVariant(exp, jobPosting.title);
        if (betterTitle) {
            exp.displayTitle = betterTitle;
        }
    });

    // Reorder skills
    const prioritizedSkills = reorderSkillsByRelevance(
        userProfile.skills,
        requiredSkills
    );

    // Generate summary
    const summary = generatePersonalizedSummary(
        userProfile,
        jobPosting,
        jobPosting.company
    );

    return {
        summary,
        experiences: selectedExperiences,
        skills: prioritizedSkills,
        education: userProfile.education || [],
        projects: userProfile.projects || [],
        format: determineResumeFormat(jobPosting.company?.type),
        tone: determineTone(jobPosting.company?.type)
    };
}

/**
 * Generate cover letter based on context
 * @param {object} userProfile - User profile
 * @param {object} job - Job posting
 * @param {object} company - Company information
 * @param {object} patterns - Detected company patterns
 * @returns {string} - Generated cover letter
 */
export function generateCoverLetter(userProfile, job, company, patterns = {}) {
    const name = userProfile.name || 'Applicant';
    const targetRole = job.title || 'the position';
    const companyName = company?.name || 'your company';

    let opening = '';
    let body = '';

    if (patterns.reverseJobOpportunity) {
        opening = `I noticed ${companyName} recently hired ${patterns.recentHires || 'several team members'} but doesn't have a ${userProfile.targetRoles?.[0] || targetRole}. Based on your growth trajectory, I believe this role would be valuable to your organization.`;
        body = `With my background in ${(userProfile.skills?.technical || []).slice(0, 3).join(', ')}, I can help bridge this gap and accelerate your team's capabilities.`;
    } else if (company?.fundingDate && daysSince(company.fundingDate) < 30) {
        opening = `Congratulations on your recent ${company.fundingAmount || ''} ${company.fundingRound || 'funding round'}! I'm reaching out because I specialize in helping startups scale post-funding.`;
        body = `My experience in ${(userProfile.skills?.technical || []).slice(0, 3).join(', ')} directly aligns with the challenges fast-growing companies face during this exciting phase.`;
    } else if (company?.isGitHubTrending) {
        opening = `I've been following ${companyName}'s work on GitHub and I'm impressed by ${company.recentMilestone || 'your recent growth'}. I'd love to contribute to your open-source mission.`;
        body = `As someone who values technical excellence and community-driven development, I believe my skills would complement your team well.`;
    } else {
        opening = `I'm excited about the ${targetRole} role at ${companyName}. Your work on ${company?.mainProduct || 'innovative solutions'} aligns perfectly with my experience and career goals.`;
        body = `With expertise in ${(userProfile.skills?.technical || []).slice(0, 3).join(', ')}, I'm confident I can make meaningful contributions to your team from day one.`;
    }

    const topAchievement = userProfile.experiences?.[0]?.achievements?.[0]?.text ||
        'driving significant improvements in my previous roles';

    const closing = `In my current role, I've demonstrated my ability to deliver results, including ${topAchievement}. I'm eager to bring this same level of impact to ${companyName}.

I would welcome the opportunity to discuss how my background and skills would benefit your team. Thank you for considering my application.

Best regards,
${name}`;

    return `Dear Hiring Manager,

${opening}

${body}

${closing}`;
}

function daysSince(date) {
    if (!date) return Infinity;
    const then = new Date(date);
    const now = new Date();
    return Math.ceil((now - then) / (1000 * 60 * 60 * 24));
}
