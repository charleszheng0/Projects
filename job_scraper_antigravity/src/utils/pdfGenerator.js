/**
 * ATS-Friendly PDF Generator
 * Uses jsPDF to create pixel-perfect, readable PDFs compliant with ATS systems
 */

import { jsPDF } from 'jspdf';

/**
 * Generate a PDF blob from structured resume data
 */
export function generateResumePDF(data) {
    const {
        personalInfo,
        summary,
        experiences,
        education,
        skills,
        projects,
        certifications
    } = data.optimizedResume;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
    });

    // ATS-friendly settings as per requirements
    const settings = {
        pageWidth: 612,
        pageHeight: 792,
        margin: 54, // 0.75 inch
        font: 'helvetica', // Standard ATS-safe font
        lineHeight: 1.2,
        colors: {
            text: '#000000', // Black text only
            lines: '#000000'
        },
        fontSize: {
            name: 18,
            header: 12,
            subHeader: 11,
            body: 10,
            small: 9
        }
    };

    let yPos = settings.margin;
    const contentWidth = settings.pageWidth - (settings.margin * 2);

    // Helper: Check Page Break
    function checkPageBreak(heightNeeded) {
        if (yPos + heightNeeded > settings.pageHeight - settings.margin) {
            doc.addPage();
            yPos = settings.margin;
            return true;
        }
        return false;
    }

    // Helper: Add Text
    function addText(text, fontSize, style = 'normal', align = 'left', indent = 0) {
        doc.setFontSize(fontSize);
        doc.setFont(settings.font, style);
        doc.setTextColor(settings.colors.text);

        // Calculate lines
        const maxLineWith = contentWidth - indent;
        const lines = doc.splitTextToSize(text, maxLineWith);

        lines.forEach(line => {
            checkPageBreak(fontSize * settings.lineHeight);

            let xPos = settings.margin + indent;
            if (align === 'center') xPos = settings.pageWidth / 2;
            if (align === 'right') xPos = settings.pageWidth - settings.margin;

            doc.text(line, xPos, yPos, { align });
            yPos += fontSize * settings.lineHeight;
        });

        return lines.length;
    }

    // Helper: Add Section Header
    function addSectionHeader(title) {
        yPos += 10; // Spacing before header
        checkPageBreak(30);

        addText(title.toUpperCase(), settings.fontSize.header, 'bold');

        // Add underline
        doc.setLineWidth(0.5);
        doc.line(settings.margin, yPos - 6, settings.pageWidth - settings.margin, yPos - 6);
        yPos += 6;
    }

    // 1. HEADER (Contact Info)
    addText(personalInfo.name, settings.fontSize.name, 'bold', 'center');
    yPos += 5;

    const contactParts = [
        personalInfo.email,
        personalInfo.phone,
        personalInfo.location,
        personalInfo.linkedin ? `LinkedIn: ${personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '')}` : '',
        personalInfo.github ? `GitHub: ${personalInfo.github.replace(/^https?:\/\/(www\.)?/, '')}` : '',
        personalInfo.portfolio ? `Portfolio: ${personalInfo.portfolio.replace(/^https?:\/\/(www\.)?/, '')}` : ''
    ].filter(Boolean);

    addText(contactParts.join(' | '), settings.fontSize.small, 'normal', 'center');
    yPos += 15;

    // 2. PROFESSIONAL SUMMARY
    if (summary) {
        addSectionHeader('PROFESSIONAL SUMMARY');
        addText(summary, settings.fontSize.body);
    }

    // 3. SKILLS (Reordered as per robust ATS practices)
    if (skills) {
        addSectionHeader('TECHNICAL SKILLS');

        // Group skills
        const skillGroups = [];
        if (skills.technical?.languages?.length) skillGroups.push(`Languages: ${skills.technical.languages.join(', ')}`);
        if (skills.technical?.frameworks?.length) skillGroups.push(`Frameworks: ${skills.technical.frameworks.join(', ')}`);
        if (skills.technical?.tools?.length) skillGroups.push(`Tools/Cloud: ${skills.technical.tools.join(', ')}`);
        if (skills.technical?.databases?.length) skillGroups.push(`Databases: ${skills.technical.databases.join(', ')}`);

        skillGroups.forEach(group => {
            addText(group, settings.fontSize.body);
        });
    }

    // 4. PROFESSIONAL EXPERIENCE
    if (experiences?.length) {
        addSectionHeader('PROFESSIONAL EXPERIENCE');

        experiences.forEach((exp, index) => {
            // Title line
            if (index > 0) yPos += 8;
            checkPageBreak(50);

            // Company & Location (Left & Right)
            doc.setFontSize(settings.fontSize.subHeader);
            doc.setFont(settings.font, 'bold');
            doc.text(exp.company, settings.margin, yPos);

            doc.setFont(settings.font, 'normal');
            doc.text(exp.location || '', settings.pageWidth - settings.margin, yPos, { align: 'right' });
            yPos += settings.fontSize.subHeader * settings.lineHeight;

            // Role & Dates (Left & Right)
            doc.setFont(settings.font, 'bold'); // Role often italicized or bold
            doc.setFont(settings.font, 'italic');
            doc.text(exp.title, settings.margin, yPos);

            doc.setFont(settings.font, 'normal'); // Reset italic for date
            doc.text(`${exp.startDate} - ${exp.endDate}`, settings.pageWidth - settings.margin, yPos, { align: 'right' });
            yPos += settings.fontSize.subHeader * settings.lineHeight;

            // Bullets
            const allBullets = [
                ...(exp.responsibilities || []),
                ...(exp.achievements?.map(a => typeof a === 'string' ? a : a.text) || [])
            ];

            allBullets.forEach(bullet => {
                // Draw bullet point manually for control
                checkPageBreak(settings.fontSize.body * settings.lineHeight);
                doc.text('•', settings.margin + 5, yPos);
                addText(bullet, settings.fontSize.body, 'normal', 'left', 18);
            });
        });
    }

    // 5. EDUCATION
    if (education?.length) {
        addSectionHeader('EDUCATION');

        education.forEach((edu, index) => {
            if (index > 0) yPos += 8;
            checkPageBreak(40);

            // School & Location
            doc.setFontSize(settings.fontSize.subHeader);
            doc.setFont(settings.font, 'bold');
            doc.text(edu.school, settings.margin, yPos);

            doc.setFont(settings.font, 'normal');
            doc.text(edu.location || '', settings.pageWidth - settings.margin, yPos, { align: 'right' });
            yPos += settings.fontSize.subHeader * settings.lineHeight;

            // Degree & Date
            doc.setFont(settings.font, 'italic');
            doc.text(`${edu.degree}${edu.major ? ' in ' + edu.major : ''}`, settings.margin, yPos);

            doc.setFont(settings.font, 'normal');
            doc.text(edu.graduationDate || edu.year || '', settings.pageWidth - settings.margin, yPos, { align: 'right' });
            yPos += settings.fontSize.body * settings.lineHeight;
        });
    }

    // 6. PROJECTS (Optional)
    if (projects?.length) {
        addSectionHeader('PROJECTS');

        projects.forEach((proj, index) => {
            if (index > 0) yPos += 6;
            checkPageBreak(40);

            doc.setFontSize(settings.fontSize.subHeader);
            doc.setFont(settings.font, 'bold');
            doc.text(proj.name, settings.margin, yPos);
            yPos += settings.fontSize.subHeader * settings.lineHeight;

            addText(proj.description, settings.fontSize.body);
            if (proj.technologies) {
                addText(`Technologies: ${proj.technologies.join(', ')}`, settings.fontSize.body, 'italic');
            }
        });
    }

    // 7. CERTIFICATIONS (Optional)
    if (certifications?.length) {
        addSectionHeader('CERTIFICATIONS');

        certifications.forEach(cert => {
            checkPageBreak(20);
            const text = `${cert.name} - ${cert.issuer}${cert.date ? ' (' + cert.date + ')' : ''}`;
            addText(text, settings.fontSize.body);
        });
    }

    return doc.output('blob');
}
