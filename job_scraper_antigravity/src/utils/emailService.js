/**
 * Email Service using EmailJS
 * Sends job application emails directly from the browser
 */

import emailjs from '@emailjs/browser';

// Storage keys
const EMAILJS_CONFIG_KEY = 'emailjs_config';

/**
 * Get EmailJS configuration from localStorage
 */
function getConfig() {
    const config = localStorage.getItem(EMAILJS_CONFIG_KEY);
    return config ? JSON.parse(config) : null;
}

/**
 * Save EmailJS configuration to localStorage
 */
export function saveConfig(config) {
    localStorage.setItem(EMAILJS_CONFIG_KEY, JSON.stringify({
        serviceId: config.serviceId,
        templateId: config.templateId,
        publicKey: config.publicKey,
        userEmail: config.userEmail // For test mode - sends to this instead
    }));
}

/**
 * Check if EmailJS is configured
 */
export function isConfigured() {
    const config = getConfig();
    return !!(config?.serviceId && config?.templateId && config?.publicKey);
}

/**
 * Get current configuration (for display)
 */
export function getCurrentConfig() {
    return getConfig();
}

/**
 * Initialize EmailJS with public key
 */
function initEmailJS() {
    const config = getConfig();
    if (!config?.publicKey) {
        throw new Error('EmailJS not configured. Please add credentials in Settings.');
    }
    emailjs.init(config.publicKey);
}

/**
 * Send a job application email
 * @param {Object} params - Email parameters
 * @param {string} params.toEmail - Recipient email (or company email)
 * @param {string} params.toName - Recipient name
 * @param {string} params.subject - Email subject
 * @param {string} params.body - Email body
 * @param {string} params.fromName - Sender name
 * @param {string} params.fromEmail - Sender email (for reply-to)
 * @param {boolean} params.testMode - If true, send to user's email instead
 */
export async function sendApplication({
    toEmail,
    toName = 'Hiring Manager',
    subject,
    body,
    fromName,
    fromEmail,
    testMode = false
}) {
    const config = getConfig();

    if (!isConfigured()) {
        throw new Error('EmailJS not configured. Please add credentials in Settings.');
    }

    initEmailJS();

    // In test mode, send to user's own email
    const recipientEmail = testMode ? config.userEmail : toEmail;

    const templateParams = {
        to_email: recipientEmail,
        to_name: toName,
        from_name: fromName,
        from_email: fromEmail,
        reply_to: fromEmail,
        subject: testMode ? `[TEST] ${subject}` : subject,
        message: body
    };

    try {
        const result = await emailjs.send(
            config.serviceId,
            config.templateId,
            templateParams
        );

        return {
            success: true,
            messageId: result.text,
            status: result.status
        };
    } catch (error) {
        console.error('EmailJS error:', error);
        return {
            success: false,
            error: error.text || error.message || 'Failed to send email'
        };
    }
}

/**
 * Send a test email to verify configuration
 */
export async function sendTestEmail() {
    const config = getConfig();

    if (!config?.userEmail) {
        throw new Error('User email not configured. Add your email in Settings.');
    }

    return await sendApplication({
        toEmail: config.userEmail,
        toName: 'Test Recipient',
        subject: 'Test Email from Autonomous Job Hunter',
        body: `This is a test email to verify your EmailJS configuration is working correctly.

If you received this email, your setup is complete and ready to send job applications!

Sent at: ${new Date().toLocaleString()}`,
        fromName: 'Job Hunter Test',
        fromEmail: config.userEmail,
        testMode: false // Send directly to user email
    });
}

/**
 * Create a professional application email subject
 */
export function createEmailSubject(jobTitle, companyName, applicantName) {
    return `Application for ${jobTitle} Position - ${applicantName}`;
}

/**
 * Create a professional email body wrapping the cover letter
 */
export function createApplicationEmail(coverLetter, applicantName, jobTitle) {
    return `Dear Hiring Manager,

Please find below my application for the ${jobTitle} position.

---

${coverLetter}

---

Best regards,
${applicantName}

Note: Full resume available upon request or attached to this email.`;
}
