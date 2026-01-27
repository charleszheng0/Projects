/**
 * Storage Service
 * Persists user profile, applications, and settings using localStorage
 */

// Storage keys
const STORAGE_KEYS = {
    USER_PROFILE: 'job_hunter_profile',
    APPLICATIONS: 'job_hunter_applications',
    SETTINGS: 'job_hunter_settings',
    RESUME_VARIANTS: 'job_hunter_resume_variants',
    COVER_LETTERS: 'job_hunter_cover_letters'
};

/**
 * Save user profile
 */
export function saveProfile(profile) {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
}

/**
 * Load user profile
 */
export function loadProfile() {
    const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : null;
}

/**
 * Save a single application
 */
export function saveApplication(application) {
    const applications = loadApplications();

    // Check if application already exists (update) or new (add)
    const existingIndex = applications.findIndex(a => a.id === application.id);

    if (existingIndex >= 0) {
        applications[existingIndex] = application;
    } else {
        applications.unshift(application); // Add to beginning
    }

    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
    return application;
}

/**
 * Load all applications
 */
export function loadApplications() {
    const data = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    return data ? JSON.parse(data) : [];
}

/**
 * Update application status
 */
export function updateApplicationStatus(applicationId, status, notes = '') {
    const applications = loadApplications();
    const app = applications.find(a => a.id === applicationId);

    if (app) {
        app.status = status;
        app.lastUpdated = new Date().toISOString();
        if (notes) app.notes = notes;

        // Update timeline
        const stepMap = {
            'sent': 'Applied',
            'viewed': 'Viewed',
            'responded': 'Response',
            'interview': 'Interview',
            'rejected': 'Rejected',
            'offer': 'Offer'
        };

        const stepName = stepMap[status];
        if (stepName && app.timeline) {
            const step = app.timeline.find(s => s.step === stepName);
            if (step) {
                step.completed = true;
                step.date = new Date().toISOString();
            }
        }

        localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
    }

    return app;
}

/**
 * Delete an application
 */
export function deleteApplication(applicationId) {
    const applications = loadApplications().filter(a => a.id !== applicationId);
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
}

/**
 * Save settings
 */
export function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

/**
 * Load settings
 */
export function loadSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
}

/**
 * Save resume variant for an opportunity
 */
export function saveResumeVariant(opportunityId, resume) {
    const variants = loadResumeVariants();
    variants[opportunityId] = resume;
    localStorage.setItem(STORAGE_KEYS.RESUME_VARIANTS, JSON.stringify(variants));
}

/**
 * Load all resume variants
 */
export function loadResumeVariants() {
    const data = localStorage.getItem(STORAGE_KEYS.RESUME_VARIANTS);
    return data ? JSON.parse(data) : {};
}

/**
 * Save cover letter for an opportunity
 */
export function saveCoverLetter(opportunityId, coverLetter) {
    const letters = loadCoverLetters();
    letters[opportunityId] = coverLetter;
    localStorage.setItem(STORAGE_KEYS.COVER_LETTERS, JSON.stringify(letters));
}

/**
 * Load all cover letters
 */
export function loadCoverLetters() {
    const data = localStorage.getItem(STORAGE_KEYS.COVER_LETTERS);
    return data ? JSON.parse(data) : {};
}

/**
 * Export applications to CSV
 */
export function exportToCSV() {
    const applications = loadApplications();

    if (applications.length === 0) {
        throw new Error('No applications to export');
    }

    const headers = [
        'Company',
        'Job Title',
        'Applied Date',
        'Status',
        'Last Updated',
        'Notes'
    ];

    const rows = applications.map(app => [
        app.company || '',
        app.title || '',
        app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : '',
        app.status || '',
        app.lastUpdated ? new Date(app.lastUpdated).toLocaleDateString() : '',
        (app.notes || '').replace(/,/g, ';').replace(/\n/g, ' ')
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    downloadFile(csvContent, 'job-applications.csv', 'text/csv');

    return { success: true, count: applications.length };
}

/**
 * Export applications to JSON (for backup)
 */
export function exportToJSON() {
    const data = {
        profile: loadProfile(),
        applications: loadApplications(),
        settings: loadSettings(),
        exportDate: new Date().toISOString()
    };

    downloadFile(
        JSON.stringify(data, null, 2),
        'job-hunter-backup.json',
        'application/json'
    );

    return { success: true };
}

/**
 * Import data from JSON backup
 */
export function importFromJSON(jsonString) {
    try {
        const data = JSON.parse(jsonString);

        if (data.profile) saveProfile(data.profile);
        if (data.applications) {
            localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(data.applications));
        }
        if (data.settings) saveSettings(data.settings);

        return { success: true, importedAt: new Date().toISOString() };
    } catch (error) {
        return { success: false, error: 'Invalid backup file format' };
    }
}

/**
 * Clear all stored data
 */
export function clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    localStorage.removeItem('claude_api_key');
    localStorage.removeItem('emailjs_config');
}

/**
 * Get storage usage stats
 */
export function getStorageStats() {
    let totalSize = 0;

    Object.values(STORAGE_KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) totalSize += item.length;
    });

    return {
        applications: loadApplications().length,
        resumeVariants: Object.keys(loadResumeVariants()).length,
        coverLetters: Object.keys(loadCoverLetters()).length,
        totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
        hasProfile: !!loadProfile()
    };
}

/**
 * Helper to download a file
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
