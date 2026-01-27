/**
 * Resume Parser Utility
 * Parses PDF, DOCX, and TXT resumes into structured data
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Parse a resume file and extract text content
 * @param {File} file - The uploaded file
 * @returns {Promise<string>} - The raw text content
 */
export async function parseResumeFile(file) {
    const fileType = file.name.split('.').pop().toLowerCase();

    switch (fileType) {
        case 'pdf':
            return await parsePDF(file);
        case 'docx':
            return await parseDOCX(file);
        case 'txt':
            return await parseTXT(file);
        default:
            throw new Error(`Unsupported file type: ${fileType}`);
    }
}

/**
 * Parse PDF file
 */
async function parsePDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
}

/**
 * Parse DOCX file
 */
async function parseDOCX(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

/**
 * Parse TXT file
 */
async function parseTXT(file) {
    return await file.text();
}

/**
 * Extract structured data from resume text using regex patterns
 * This is a basic extraction - Claude API will do more intelligent parsing
 */
export function extractBasicInfo(text) {
    const info = {
        name: '',
        email: '',
        phone: '',
        linkedIn: '',
        github: '',
        skills: [],
        rawText: text
    };

    // Email pattern
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
        info.email = emailMatch[0];
    }

    // Phone pattern (various formats)
    const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
    if (phoneMatch) {
        info.phone = phoneMatch[0];
    }

    // LinkedIn URL
    const linkedInMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
    if (linkedInMatch) {
        info.linkedIn = 'https://' + linkedInMatch[0];
    }

    // GitHub URL
    const githubMatch = text.match(/github\.com\/[\w-]+/i);
    if (githubMatch) {
        info.github = 'https://' + githubMatch[0];
    }

    // Common tech skills detection
    const commonSkills = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP',
        'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
        'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
        'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
        'Git', 'CI/CD', 'Jenkins', 'GitHub Actions',
        'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP',
        'Agile', 'Scrum', 'Jira', 'REST API', 'GraphQL', 'Microservices'
    ];

    commonSkills.forEach(skill => {
        const regex = new RegExp(`\\b${skill}\\b`, 'i');
        if (regex.test(text)) {
            info.skills.push(skill);
        }
    });

    // Try to extract name (usually at the top of resume)
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
        // First non-empty line might be the name
        const potentialName = lines[0].trim();
        // Simple heuristic: if it's 2-4 words and doesn't look like an address/email
        if (potentialName.split(/\s+/).length >= 2 &&
            potentialName.split(/\s+/).length <= 4 &&
            !potentialName.includes('@') &&
            !potentialName.includes('http')) {
            info.name = potentialName;
        }
    }

    return info;
}

/**
 * Validate file before parsing
 */
export function validateResumeFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['pdf', 'docx', 'txt'];

    const fileType = file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(fileType)) {
        return { valid: false, error: `File type .${fileType} not supported. Use PDF, DOCX, or TXT.` };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'File too large. Maximum size is 10MB.' };
    }

    return { valid: true };
}
