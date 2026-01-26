/**
 * Validation and Safety Utilities
 * Ensures resume modifications are valid and implements rate limiting
 */

/**
 * Validate resume modifications to ensure no fabrication
 * @param {object} original - Original user profile
 * @param {object} modified - Modified resume
 * @returns {object} - Validation result
 */
export function validateResumeModifications(original, modified) {
    const checks = {
        dateRangeOK: true,
        titlesValid: true,
        achievementsReal: true,
        noDegreesFabricated: true,
        skillsValid: true
    };

    const errors = [];

    // Check date ranges (max ±2 months tolerance)
    if (original.experiences && modified.experiences) {
        for (const modExp of modified.experiences) {
            const origExp = original.experiences.find(e => e.id === modExp.id);
            if (origExp) {
                // Validate dates haven't changed significantly
                if (modExp.startDate && origExp.startDate) {
                    const diff = Math.abs(
                        new Date(modExp.startDate) - new Date(origExp.startDate)
                    );
                    if (diff > 60 * 24 * 60 * 60 * 1000) { // More than 60 days
                        checks.dateRangeOK = false;
                        errors.push(`Date range modification too large for ${origExp.title}`);
                    }
                }
            }
        }
    }

    // Check titles are valid alternatives
    if (modified.experiences) {
        for (const modExp of modified.experiences) {
            if (modExp.displayTitle) {
                const origExp = original.experiences?.find(e => e.id === modExp.id);
                if (origExp && !origExp.alternativeTitles?.includes(modExp.displayTitle)) {
                    // Check if it's the original title
                    if (modExp.displayTitle !== origExp.title) {
                        checks.titlesValid = false;
                        errors.push(`Invalid title variant: ${modExp.displayTitle}`);
                    }
                }
            }
        }
    }

    // Check achievements exist in original
    if (modified.experiences && original.experiences) {
        for (const modExp of modified.experiences) {
            const origExp = original.experiences.find(e => e.id === modExp.id);
            if (origExp && modExp.achievements) {
                for (const modAch of modExp.achievements) {
                    const found = origExp.achievements?.some(origAch =>
                        similarity(modAch.text, origAch.text) > 0.7
                    );
                    if (!found) {
                        checks.achievementsReal = false;
                        errors.push(`Achievement not found in original: ${modAch.text?.substring(0, 50)}...`);
                    }
                }
            }
        }
    }

    // Check degrees aren't fabricated
    if (modified.education) {
        for (const modEdu of modified.education) {
            const found = original.education?.some(origEdu =>
                origEdu.degree === modEdu.degree && origEdu.school === modEdu.school
            );
            if (!found) {
                checks.noDegreesFabricated = false;
                errors.push(`Degree not found in original: ${modEdu.degree} from ${modEdu.school}`);
            }
        }
    }

    // Check skills are real
    if (modified.skills?.technical) {
        const allOriginalSkills = [
            ...(original.skills?.technical || []),
            ...(original.skills?.soft || []),
            ...(original.skills?.languages || [])
        ].map(s => s.toLowerCase());

        for (const skill of modified.skills.technical) {
            if (!allOriginalSkills.some(s =>
                s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s)
            )) {
                checks.skillsValid = false;
                errors.push(`Skill not found in original: ${skill}`);
            }
        }
    }

    const isValid = Object.values(checks).every(v => v);

    return {
        isValid,
        checks,
        errors
    };
}

/**
 * Calculate string similarity (simple Jaccard-like)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score 0-1
 */
export function similarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().split(/\s+/);
    const s2 = str2.toLowerCase().split(/\s+/);

    const set1 = new Set(s1);
    const set2 = new Set(s2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
}

/**
 * Rate limiter for applications
 */
export class RateLimiter {
    constructor(maxPerDay = 100, minIntervalMs = 60000) {
        this.maxPerDay = maxPerDay;
        this.minIntervalMs = minIntervalMs;
        this.applications = [];
    }

    /**
     * Check if we can send an application
     * @returns {object} - { canProceed, waitTime, dailyRemaining }
     */
    canApply() {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        // Clean old entries
        this.applications = this.applications.filter(t => t > oneDayAgo);

        // Check daily limit
        if (this.applications.length >= this.maxPerDay) {
            const oldest = Math.min(...this.applications);
            const resetTime = oldest + 24 * 60 * 60 * 1000 - now;
            return {
                canProceed: false,
                waitTime: resetTime,
                dailyRemaining: 0,
                reason: 'Daily limit reached'
            };
        }

        // Check minimum interval
        if (this.applications.length > 0) {
            const lastApplication = Math.max(...this.applications);
            const timeSinceLast = now - lastApplication;

            if (timeSinceLast < this.minIntervalMs) {
                return {
                    canProceed: false,
                    waitTime: this.minIntervalMs - timeSinceLast,
                    dailyRemaining: this.maxPerDay - this.applications.length,
                    reason: 'Minimum interval not met'
                };
            }
        }

        return {
            canProceed: true,
            waitTime: 0,
            dailyRemaining: this.maxPerDay - this.applications.length
        };
    }

    /**
     * Record an application
     */
    recordApplication() {
        this.applications.push(Date.now());
    }

    /**
     * Get statistics
     */
    getStats() {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const todayApplications = this.applications.filter(t => t > oneDayAgo);

        return {
            todayCount: todayApplications.length,
            dailyLimit: this.maxPerDay,
            remaining: this.maxPerDay - todayApplications.length,
            lastApplication: todayApplications.length > 0
                ? new Date(Math.max(...todayApplications))
                : null
        };
    }
}

/**
 * Settings validator
 * @param {object} settings - Application settings
 * @returns {object} - Validated settings with defaults
 */
export function validateSettings(settings) {
    return {
        autoApply: settings.autoApply ?? false,
        autoApplyThreshold: Math.max(0, Math.min(100, settings.autoApplyThreshold ?? 80)),
        searchFrequency: ['aggressive', 'moderate', 'conservative'].includes(settings.searchFrequency)
            ? settings.searchFrequency
            : 'moderate',
        maxApplicationsPerDay: Math.max(1, Math.min(100, settings.maxApplicationsPerDay ?? 30)),
        requireReview: settings.requireReview ?? true,
        notificationsEnabled: settings.notificationsEnabled ?? true
    };
}

/**
 * Format validation errors for display
 * @param {string[]} errors - Array of error messages
 * @returns {string} - Formatted error message
 */
export function formatValidationErrors(errors) {
    if (!errors || errors.length === 0) return '';

    return `Validation failed:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
}

/**
 * Sanitize user input
 * @param {string} input - User input string
 * @returns {string} - Sanitized string
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return '';

    return input
        .trim()
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[^\w\s\-.,@#$%&*()[\]{}|:;"'<>?/\\+=!]/g, '') // Remove special chars
        .substring(0, 10000); // Limit length
}
