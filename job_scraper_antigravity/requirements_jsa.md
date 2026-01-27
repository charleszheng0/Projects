ANTIGRAVITY PROMPT: AI-POWERED RESUME OPTIMIZER & ATS FORMATTER
OBJECTIVE
Create a standalone web application that takes a user's resume and a target job description, then generates a perfectly optimized, ATS-compliant resume tailored to that specific job. The system must produce error-free, professionally formatted PDF output.

CORE FEATURES
1. DUAL INPUT SYSTEM
Resume Input (Multiple Formats):

File upload: PDF, DOCX, TXT
Direct text paste
LinkedIn profile import (paste LinkedIn URL)
Manual form entry as fallback

Job Description Input:

Paste job description text
Enter job posting URL (auto-fetch with web_fetch)
LinkedIn job URL (auto-extract)
Multiple job comparison mode (optimize for 2-5 jobs simultaneously)


2. INTELLIGENT RESUME PARSER
Extract ALL resume data with perfect accuracy:
javascriptasync function parseResumeWithClaude(resumeText, fileName) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: `You are an expert resume parser. Extract ALL information from this resume with perfect accuracy. Return ONLY valid JSON with no markdown formatting.

CRITICAL REQUIREMENTS:
- Extract EVERY detail, even minor ones
- Preserve exact wording of achievements
- Capture all dates, locations, and metrics
- Identify keywords and technical terms
- Note the current formatting style and structure
- Extract contact information completely

Return this exact JSON structure:

{
  "personalInfo": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+1-XXX-XXX-XXXX",
    "location": "City, State, Country",
    "linkedin": "linkedin.com/in/username",
    "github": "github.com/username",
    "portfolio": "website.com",
    "other_links": ["link1", "link2"]
  },
  "summary": "Professional summary or objective statement",
  "experiences": [
    {
      "title": "Exact Job Title",
      "company": "Company Name",
      "location": "City, State",
      "startDate": "Month YYYY",
      "endDate": "Month YYYY or Present",
      "duration": "X years Y months",
      "responsibilities": [
        "Exact bullet point 1",
        "Exact bullet point 2"
      ],
      "achievements": [
        {
          "text": "Achievement with metrics",
          "metrics": ["60% improvement", "$2M revenue"],
          "keywords": ["leadership", "optimization", "AWS"]
        }
      ],
      "technologies": ["Tech1", "Tech2", "Tech3"]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science in Computer Science",
      "major": "Computer Science",
      "minor": "Mathematics",
      "school": "University Name",
      "location": "City, State",
      "graduationDate": "Month YYYY",
      "gpa": "3.8/4.0",
      "honors": ["Magna Cum Laude", "Dean's List"],
      "relevantCoursework": ["Course 1", "Course 2"]
    }
  ],
  "skills": {
    "technical": {
      "languages": ["Python", "JavaScript", "Java"],
      "frameworks": ["React", "Django", "Node.js"],
      "tools": ["Git", "Docker", "AWS"],
      "databases": ["PostgreSQL", "MongoDB"],
      "other": ["Skill1", "Skill2"]
    },
    "soft": ["Leadership", "Communication", "Problem Solving"],
    "certifications": [
      {
        "name": "AWS Certified Solutions Architect",
        "issuer": "Amazon",
        "date": "YYYY",
        "credentialId": "XXX-YYY"
      }
    ],
    "languages": ["English (Native)", "Spanish (Professional)"]
  },
  "projects": [
    {
      "name": "Project Name",
      "description": "What it does and impact",
      "technologies": ["Tech1", "Tech2"],
      "role": "Your role",
      "url": "github.com/project",
      "highlights": ["Achievement 1", "Achievement 2"]
    }
  ],
  "awards": [
    {
      "title": "Award Name",
      "issuer": "Organization",
      "date": "YYYY",
      "description": "Why you received it"
    }
  ],
  "publications": [
    {
      "title": "Paper Title",
      "venue": "Conference/Journal",
      "date": "YYYY",
      "url": "link to paper"
    }
  ],
  "volunteering": [
    {
      "role": "Volunteer Position",
      "organization": "Org Name",
      "dates": "YYYY - YYYY",
      "description": "What you did"
    }
  ],
  "additionalSections": {
    // Any other sections found
  },
  "originalFormatting": {
    "style": "modern/traditional/creative",
    "font": "detected font",
    "colors": ["#000000"],
    "layout": "single-column/two-column",
    "sectionsOrder": ["Experience", "Education", "Skills"]
  }
}

Resume content:
Filename: ${fileName}

${resumeText}

Parse with extreme attention to detail. Do not miss anything.`
        }
      ],
    })
  });
  
  const data = await response.json();
  const jsonText = data.content[0].text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  
  return JSON.parse(jsonText);
}

3. JOB DESCRIPTION ANALYZER
Extract requirements and optimize targeting:
javascriptasync function analyzeJobDescription(jobDescriptionText, jobUrl = null) {
  // If URL provided, fetch the full content first
  let fullJobText = jobDescriptionText;
  
  if (jobUrl) {
    try {
      const fetched = await fetch("web_fetch", {
        method: "POST",
        body: JSON.stringify({ url: jobUrl })
      });
      const data = await fetched.json();
      fullJobText = data.content || jobDescriptionText;
    } catch (e) {
      console.log("Could not fetch URL, using provided text");
    }
  }
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      messages: [
        {
          role: "user",
          content: `Analyze this job description in extreme detail for resume optimization. Return ONLY valid JSON.

{
  "jobTitle": "Exact job title",
  "company": "Company name",
  "location": "Location",
  "employmentType": "Full-time/Contract/etc",
  "experienceLevel": "Entry/Mid/Senior/Lead/Principal",
  "
salaryRange": "If mentioned",
  
  "requiredSkills": {
    "mustHave": ["Skill1", "Skill2"],
    "technical": ["Python", "AWS", "Docker"],
    "soft": ["Leadership", "Communication"],
    "yearsOfExperience": "5+ years",
    "education": "BS in Computer Science or equivalent"
  },
  
  "preferredSkills": {
    "niceToHave": ["Skill1", "Skill2"],
    "bonus": ["Industry experience", "Specific tool"]
  },
  
  "responsibilities": [
    "Main responsibility 1",
    "Main responsibility 2"
  ],
  
  "keywords": {
    "critical": ["keyword1", "keyword2"],
    "important": ["keyword3", "keyword4"],
    "contextual": ["keyword5", "keyword6"]
  },
  
  "atsKeywords": {
    "technical": ["exact technical terms from job"],
    "action_verbs": ["led", "developed", "managed"],
    "industry_terms": ["agile", "CI/CD", "microservices"],
    "certifications": ["AWS Certified", "PMP"]
  },
  
  "companyInfo": {
    "industry": "Tech/Finance/Healthcare/etc",
    "size": "Startup/Mid-size/Enterprise",
    "culture": "Fast-paced/Collaborative/etc from description",
    "values": ["Innovation", "Customer-focus"]
  },
  
  "optimizationStrategy": {
    "emphasize": ["What to highlight in resume"],
    "deemphasize": ["What to minimize"],
    "reframe": ["How to reposition experience"],
    "addIfMissing": ["Skills/keywords to add if candidate has them"]
  },
  
  "atsCompatibility": {
    "requiredSections": ["Experience", "Education", "Skills"],
    "formatPreferences": "Simple/Standard/Modern",
    "avoidFormatting": ["tables", "graphics", "columns if ATS unfriendly"]
  }
}

Job Description:
${fullJobText}

Analyze for maximum ATS compatibility and keyword optimization.`
        }
      ],
    })
  });
  
  const data = await response.json();
  const jsonText = data.content[0].text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  
  return JSON.parse(jsonText);
}

4. INTELLIGENT RESUME OPTIMIZATION ENGINE
This is the core - optimize the resume for the specific job:
javascriptasync function optimizeResumeForJob(parsedResume, analyzedJob) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 12000,
      messages: [
        {
          role: "user",
          content: `You are an expert resume optimizer and ATS specialist. Transform this resume to be PERFECTLY optimized for the target job while maintaining complete truthfulness.

ORIGINAL RESUME DATA:
${JSON.stringify(parsedResume, null, 2)}

TARGET JOB ANALYSIS:
${JSON.stringify(analyzedJob, null, 2)}

OPTIMIZATION REQUIREMENTS:

1. **KEYWORD OPTIMIZATION**:
   - Integrate ALL critical and important keywords naturally
   - Use exact terminology from job description (e.g., if job says "JavaScript" don't write "JS")
   - Place high-priority keywords in first 1/3 of resume
   - Include ATS keywords in skills section AND experience bullets

2. **EXPERIENCE REFRAMING**:
   - Reorder experiences to put most relevant first
   - Rewrite bullet points to emphasize relevant achievements
   - Use action verbs from the job description
   - Quantify EVERYTHING possible (percentages, dollar amounts, time saved, team size)
   - Mirror job responsibilities in achievement descriptions
   - Remove or minimize irrelevant experiences

3. **SKILLS SECTION**:
   - Reorder skills to match job requirements priority
   - Group skills by category (Languages, Frameworks, Tools, Cloud, etc.)
   - Put required skills at the top
   - Add any missing keywords that user actually has from their experience

4. **SUMMARY/OBJECTIVE**:
   - Rewrite to directly address this specific role
   - Include 2-3 of the most critical keywords
   - Match the experience level and tone of job posting
   - Highlight biggest relevant achievement

5. **ATS COMPLIANCE**:
   - Use standard section headers: "Professional Experience", "Education", "Technical Skills"
   - No tables, text boxes, headers/footers, or graphics
   - Simple bullet points (•) only
   - Standard fonts only
   - No columns or complex layouts
   - Dates in consistent format: "Month YYYY"
   - Phone numbers in standard format: (XXX) XXX-XXXX or +1-XXX-XXX-XXXX

6. **ACHIEVEMENT FORMULA**:
   - Use: "Action Verb + Task + Result/Metric + Tool/Technology"
   - Example: "Reduced API latency by 60% through implementation of Redis caching and query optimization"
   - Every bullet should have measurable impact

7. **LENGTH OPTIMIZATION**:
   - Keep to 1 page if <5 years experience, 2 pages if 5-15 years
   - Remove fluff and redundancy
   - Every word should add value

8. **TRUTHFULNESS**:
   - Do NOT fabricate experience, skills, or achievements
   - Do NOT add technologies user hasn't used
   - CAN reframe/reword existing content
   - CAN adjust dates by ±1 month to fill small gaps
   - CAN use alternative job titles if equivalent (e.g., "Software Engineer" → "Full-Stack Developer")

Return optimized resume in this JSON format:

{
  "optimizedResume": {
    "personalInfo": { /* same structure as input */ },
    "summary": "Optimized professional summary",
    "experiences": [ /* reordered and rewritten */ ],
    "education": [ /* optimized */ ],
    "skills": { /* reorganized and prioritized */ },
    "projects": [ /* most relevant only */ ],
    "certifications": [ /* if applicable */ ],
    "awards": [ /* if adding value */ ]
  },
  
  "optimizationReport": {
    "keywordMatchScore": 95,
    "changesApplied": [
      "Reordered experiences to highlight backend development",
      "Added 12 critical keywords: AWS, Docker, Kubernetes...",
      "Quantified 8 achievements with specific metrics",
      "Rewrote summary to emphasize leadership experience",
      "Reorganized skills section by relevance"
    ],
    "atsScore": 98,
    "atsIssuesFixed": [
      "Simplified formatting",
      "Standardized section headers",
      "Removed complex tables"
    ],
    "matchAnalysis": {
      "requiredSkillsCovered": "15/15",
      "preferredSkillsCovered": "8/10",
      "experienceAlignment": "Excellent",
      "keywordDensity": "Optimal"
    },
    "suggestions": [
      "Consider adding [specific certification] if you have it",
      "Your experience with [X] wasn't clear - could add more detail if relevant"
    ]
  },
  
  "formattingInstructions": {
    "recommendedTemplate": "ATS-friendly single column",
    "fontFamily": "Arial or Calibri",
    "fontSize": {
      "name": "20pt",
      "sectionHeaders": "12pt bold",
      "body": "10-11pt"
    },
    "margins": "0.5-0.75 inches all sides",
    "spacing": "Single or 1.15 line spacing",
    "sections": [
      "Contact Information",
      "Professional Summary",
      "Technical Skills",
      "Professional Experience",
      "Education",
      "Projects (if space permits)",
      "Certifications (if applicable)"
    ]
  }
}

Generate the BEST possible resume for this job while staying 100% truthful.`
        }
      ],
    })
  });
  
  const data = await response.json();
  const jsonText = data.content[0].text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  
  return JSON.parse(jsonText);
}

5. ATS-FRIENDLY PDF GENERATOR
Generate pixel-perfect, ATS-compliant PDFs:
javascriptasync function generateATSFriendlyPDF(optimizedResumeData, formattingPreferences = {}) {
  const {
    personalInfo,
    summary,
    experiences,
    education,
    skills,
    projects,
    certifications
  } = optimizedResumeData.optimizedResume;
  
  // Use jsPDF for PDF generation
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });
  
  // ATS-friendly settings
  const settings = {
    pageWidth: 612,
    pageHeight: 792,
    margin: 40,
    fontSize: {
      name: 16,
      sectionHeader: 12,
      subsectionHeader: 11,
      body: 10,
      contact: 9
    },
    font: 'helvetica', // ATS-safe font
    lineHeight: 1.15,
    color: '#000000' // Black only for ATS
  };
  
  let yPosition = settings.margin;
  const maxWidth = settings.pageWidth - (settings.margin * 2);
  
  // Helper function to add text with proper spacing
  function addText(text, fontSize, style = 'normal', indent = 0) {
    doc.setFontSize(fontSize);
    doc.setFont(settings.font, style);
    
    const lines = doc.splitTextToSize(text, maxWidth - indent);
    
    lines.forEach(line => {
      // Check if we need a new page
      if (yPosition > settings.pageHeight - settings.margin) {
        doc.addPage();
        yPosition = settings.margin;
      }
      
      doc.text(line, settings.margin + indent, yPosition);
      yPosition += fontSize * settings.lineHeight;
    });
    
    return yPosition;
  }
  
  function addSpacing(amount) {
    yPosition += amount;
  }
  
  // 1. CONTACT INFORMATION (Centered)
  doc.setFontSize(settings.fontSize.name);
  doc.setFont(settings.font, 'bold');
  doc.text(personalInfo.name, settings.pageWidth / 2, yPosition, { align: 'center' });
  yPosition += settings.fontSize.name * 1.3;
  
  doc.setFontSize(settings.fontSize.contact);
  doc.setFont(settings.font, 'normal');
  
  const contactLine = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin?.replace('https://', ''),
    personalInfo.github?.replace('https://', '')
  ].filter(Boolean).join(' | ');
  
  doc.text(contactLine, settings.pageWidth / 2, yPosition, { align: 'center' });
  yPosition += settings.fontSize.contact * 1.5;
  
  addSpacing(10);
  
  // 2. PROFESSIONAL SUMMARY
  if (summary) {
    addText('PROFESSIONAL SUMMARY', settings.fontSize.sectionHeader, 'bold');
    addSpacing(5);
    addText(summary, settings.fontSize.body, 'normal');
    addSpacing(12);
  }
  
  // 3. TECHNICAL SKILLS
  if (skills && skills.technical) {
    addText('TECHNICAL SKILLS', settings.fontSize.sectionHeader, 'bold');
    addSpacing(5);
    
    // Organize skills by category
    const skillCategories = [];
    
    if (skills.technical.languages?.length) {
      skillCategories.push(`Languages: ${skills.technical.languages.join(', ')}`);
    }
    if (skills.technical.frameworks?.length) {
      skillCategories.push(`Frameworks: ${skills.technical.frameworks.join(', ')}`);
    }
    if (skills.technical.tools?.length) {
      skillCategories.push(`Tools: ${skills.technical.tools.join(', ')}`);
    }
    if (skills.technical.databases?.length) {
      skillCategories.push(`Databases: ${skills.technical.databases.join(', ')}`);
    }
    if (skills.technical.other?.length) {
      skillCategories.push(`Other: ${skills.technical.other.join(', ')}`);
    }
    
    skillCategories.forEach(category => {
      addText(category, settings.fontSize.body, 'normal');
      addSpacing(3);
    });
    
    addSpacing(10);
  }
  
  // 4. PROFESSIONAL EXPERIENCE
  if (experiences?.length) {
    addText('PROFESSIONAL EXPERIENCE', settings.fontSize.sectionHeader, 'bold');
    addSpacing(8);
    
    experiences.forEach((exp, index) => {
      // Job title and company
      const titleLine = `${exp.title} | ${exp.company}`;
      addText(titleLine, settings.fontSize.subsectionHeader, 'bold');
      
      // Location and dates
      const locationDateLine = `${exp.location || ''} | ${exp.startDate} – ${exp.endDate}`;
      yPosition -= 5; // Tighten spacing
      addText(locationDateLine, settings.fontSize.body, 'italic');
      addSpacing(5);
      
      // Responsibilities and achievements
      const allBullets = [
        ...(exp.responsibilities || []),
        ...(exp.achievements?.map(a => typeof a === 'string' ? a : a.text) || [])
      ];
      
      allBullets.forEach(bullet => {
        // Add bullet point
        doc.setFontSize(settings.fontSize.body);
        doc.setFont(settings.font, 'normal');
        doc.text('•', settings.margin + 10, yPosition);
        
        const lines = doc.splitTextToSize(bullet, maxWidth - 25);
        lines.forEach((line, lineIndex) => {
          if (yPosition > settings.pageHeight - settings.margin) {
            doc.addPage();
            yPosition = settings.margin;
          }
          
          doc.text(line, settings.margin + 25, yPosition);
          yPosition += settings.fontSize.body * settings.lineHeight;
        });
        
        addSpacing(2);
      });
      
      if (index < experiences.length - 1) {
        addSpacing(10);
      }
    });
    
    addSpacing(10);
  }
  
  // 5. EDUCATION
  if (education?.length) {
    addText('EDUCATION', settings.fontSize.sectionHeader, 'bold');
    addSpacing(8);
    
    education.forEach(edu => {
      const degreeLine = `${edu.degree} | ${edu.school}`;
      addText(degreeLine, settings.fontSize.subsectionHeader, 'bold');
      
      const eduDetails = [];
      if (edu.graduationDate) eduDetails.push(edu.graduationDate);
      if (edu.gpa) eduDetails.push(`GPA: ${edu.gpa}`);
      if (edu.honors?.length) eduDetails.push(edu.honors.join(', '));
      
      if (eduDetails.length) {
        yPosition -= 5;
        addText(eduDetails.join(' | '), settings.fontSize.body, 'normal');
      }
      
      addSpacing(8);
    });
  }
  
  // 6. PROJECTS (if space allows and relevant)
  if (projects?.length && yPosition < settings.pageHeight - 200) {
    addText('PROJECTS', settings.fontSize.sectionHeader, 'bold');
    addSpacing(8);
    
    projects.slice(0, 2).forEach(project => {
      const projectLine = `${project.name}${project.url ? ' | ' + project.url : ''}`;
      addText(projectLine, settings.fontSize.subsectionHeader, 'bold');
      
      yPosition -= 5;
      addText(project.description, settings.fontSize.body, 'normal');
      
      if (project.technologies?.length) {
        yPosition -= 3;
        addText(`Technologies: ${project.technologies.join(', ')}`, settings.fontSize.body, 'italic');
      }
      
      addSpacing(8);
    });
  }
  
  // 7. CERTIFICATIONS (if applicable)
  if (certifications?.length) {
    addText('CERTIFICATIONS', settings.fontSize.sectionHeader, 'bold');
    addSpacing(5);
    
    certifications.forEach(cert => {
      const certLine = `${cert.name} - ${cert.issuer}${cert.date ? ' (' + cert.date + ')' : ''}`;
      addText(certLine, settings.fontSize.body, 'normal');
      addSpacing(3);
    });
  }
  
  // Return PDF as blob
  return doc.output('blob');
}

// Alternative: Generate as clean HTML for user to print as PDF
function generateHTMLResume(optimizedResumeData) {
  const { personalInfo, summary, experiences, education, skills, projects } = 
    optimizedResumeData.optimizedResume;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${personalInfo.name} - Resume</title>
  <style>
    @page {
      size: letter;
      margin: 0.5in 0.75in;
    }
    
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      line-height: 1.15;
      color: #000000;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in 0;
    }
    
    h1 {
      font-size: 20pt;
      font-weight: bold;
      text-align: center;
      margin: 0 0 8pt 0;
      color: #000000;
    }
    
    .contact {
      font-size: 9pt;
      text-align: center;
      margin: 0 0 12pt 0;
    }
    
    h2 {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1pt solid #000000;
      margin: 12pt 0 6pt 0;
      padding-bottom: 2pt;
      color: #000000;
    }
    
    h3 {
      font-size: 11pt;
      font-weight: bold;
      margin: 6pt 0 2pt 0;
      color: #000000;
    }
    
    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    
    .job-title {
      font-weight: bold;
    }
    
    .job-dates {
      font-style: italic;
    }
    
    ul {
      margin: 4pt 0 8pt 0;
      padding-left: 20pt;
    }
    
    li {
      margin: 2pt 0;
    }
    
    .skills-grid {
      margin: 4pt 0;
    }
    
    .skill-category {
      margin: 3pt 0;
    }
    
    .skill-category strong {
      font-weight: bold;
    }
    
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <h1>${personalInfo.name}</h1>
  <div class="contact">
    ${personalInfo.email} | ${personalInfo.phone} | ${personalInfo.location}
    ${personalInfo.linkedin ? ' | ' + personalInfo.linkedin.replace('https://', '') : ''}
    ${personalInfo.github ? ' | ' + personalInfo.github.replace('https://', '') : ''}
  </div>
  
  <!-- Summary -->
  ${summary ? `
  <h2>Professional Summary</h2>
  <p>${summary}</p>
  ` : ''}
  
  <!-- Skills -->
  ${skills?.technical ? `
  <h2>Technical Skills</h2>
  <div class="skills-grid">
    ${skills.technical.languages?.length ? `
    <div class="skill-category">
      <strong>Languages:</strong> ${skills.technical.languages.join(', ')}
    </div>
    ` : ''}
    ${skills.technical.frameworks?.length ? `
    <div class="skill-category">
      <strong>Frameworks:</strong> ${skills.technical.frameworks.join(', ')}
    </div>
    ` : ''}
    ${skills.technical.tools?.length ? `
    <div class="skill-category">
      <strong>Tools:</strong> ${skills.technical.tools.join(', ')}
    </div>
    ` : ''}
    ${skills.technical.databases?.length ? `
    <div class="skill-category">
      <strong>Databases:</strong> ${skills.technical.databases.join(', ')}
    </div>
    ` : ''}
  </div>
  ` : ''}
  
  <!-- Experience -->
  ${experiences?.length ? `
  <h2>Professional Experience</h2>
  ${experiences.map(exp => `
    <div class="job-header">
      <div>
        <span class="job-title">${exp.title}</span> | ${exp.company}
      </div>
    </div>
    <div class="job-dates">
      ${exp.location || ''} | ${exp.startDate} – ${exp.endDate}
    </div>
    <ul>
      ${(exp.responsibilities || []).map(resp => `<li>${resp}</li>`).join('')}
      ${(exp.achievements || []).map(ach => 
        `<li>${typeof ach === 'string' ? ach : ach.text}</li>`
      ).join('')}
    </ul>
  `).join('')}
  ` : ''}
  
  <!-- Education -->
  ${education?.length ? `
  <h2>Education</h2>
  ${education.map(edu => `
    <div>
      <strong>${edu.degree}</strong> | ${edu.school}
      ${edu.graduationDate ? ` | ${edu.graduationDate}` : ''}
      ${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}
    </div>
    ${edu.honors?.length ? `<div>${edu.honors.join(', ')}</div>` : ''}
  `).join('')}
  ` : ''}
  
  <!-- Projects -->
  ${projects?.length ? `
  <h2>Projects</h2>
  ${projects.slice(0, 2).map(proj => `
    <div>
      <strong>${proj.name}</strong>${proj.url ? ` | ${proj.url}` : ''}
      <div>${proj.description}</div>
      ${proj.technologies?.length ? `<div><em>Technologies: ${proj.technologies.join(', ')}</em></div>` : ''}
    </div>
  `).join('')}
  ` : ''}
  
</body>
</html>
  `.trim();
}

6. ATS SCORE CALCULATOR
Provide real-time ATS compatibility score:
javascriptfunction calculateATSScore(resumeData, jobAnalysis) {
  let score = 0;
  const issues = [];
  const strengths = [];
  
  // Keyword matching (40 points)
  const resumeText = JSON.stringify(resumeData).toLowerCase();
  const criticalKeywords = jobAnalysis.atsKeywords.critical || [];
  const matchedKeywords = criticalKeywords.filter(kw => 
    resumeText.includes(kw.toLowerCase())
  );
  
  const keywordScore = (matchedKeywords.length / criticalKeywords.length) * 40;
  score += keywordScore;
  
  if (keywordScore >= 35) {
    strengths.push(`Excellent keyword match: ${matchedKeywords.length}/${criticalKeywords.length} critical keywords`);
  } else if (keywordScore >= 25) {
    issues.push(`Missing ${criticalKeywords.length - matchedKeywords.length} critical keywords`);
  } else {
    issues.push(`Poor keyword match: only ${matchedKeywords.length}/${criticalKeywords.length} critical keywords found`);
  }

  // Formatting (20 points)
  let formatScore = 20;
  // Check for standard section headers
  const standardHeaders = ['experience', 'education', 'skills'];
  const hasStandardHeaders = standardHeaders.every(header =>
    JSON.stringify(resumeData).toLowerCase().includes(header)
  );
  if (hasStandardHeaders) {
    strengths.push('Uses standard section headers');
  } else {
    formatScore -= 10;
    issues.push('Missing standard section headers');
  }
  score += formatScore;

  // Quantified achievements (15 points)
  const achievements = resumeData.experiences?.flatMap(exp =>
    exp.achievements || []
  ) || [];
  const quantified = achievements.filter(ach => {
    const text = typeof ach === 'string' ? ach : ach.text;
    return /\d+%|$\d+|x\d+|\d+ (users|customers|projects|team)/.test(text);
  });
  const achievementScore = Math.min((quantified.length / Math.max(achievements.length, 1)) * 15, 15);
  score += achievementScore;
  if (achievementScore >= 12) {
    strengths.push('Most achievements are quantified');
  } else {
    issues.push('Many achievements lack specific metrics');
  }

  // Required skills (15 points)
  const requiredSkills = jobAnalysis.requiredSkills?.mustHave || [];
  const userSkills = [
    ...(resumeData.skills?.technical?.languages || []),
    ...(resumeData.skills?.technical?.frameworks || []),
    ...(resumeData.skills?.technical?.tools || [])
  ].map(s => s.toLowerCase());
  const skillsMatched = requiredSkills.filter(skill =>
    userSkills.some(us => us.includes(skill.toLowerCase()) || skill.toLowerCase().includes(us))
  );
  const skillScore = (skillsMatched.length / Math.max(requiredSkills.length, 1)) * 15;
  score += skillScore;
  if (skillScore >= 12) {
    strengths.push(`Strong skills match: ${skillsMatched.length}/${requiredSkills.length}`);
  } else {
    issues.push(`Missing required skills: ${requiredSkills.length - skillsMatched.length}`);
  }

  // Experience level (10 points)
  const yearsRequired = parseInt(jobAnalysis.requiredSkills?.yearsOfExperience) || 0;
  const userYears = resumeData.experiences?.reduce((total, exp) => {
    const duration = calculateDuration(exp.startDate, exp.endDate);
    return total + duration;
  }, 0) || 0;
  if (userYears >= yearsRequired) {
    score += 10;
    strengths.push(`Experience exceeds requirements: ${userYears} years`);
  } else if (userYears >= yearsRequired * 0.75) {
    score += 7;
  } else {
    score += 3;
    issues.push(`Experience below requirements: ${userYears.toFixed(1)}/${yearsRequired} years`);
  }
  
  return {
    score: Math.round(score),
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    strengths,
    issues,
    recommendations: generateRecommendations(issues)
  };
}

function calculateDuration(startDate, endDate) {
  // Parse dates and calculate years
  // Simplified version
  const start = new Date(startDate);
  const end = !endDate || endDate.toLowerCase() === 'present' ? new Date() : new Date(endDate);
  
  if (isNaN(start.getTime())) return 0;
  if (isNaN(end.getTime())) return 0;
  
  return (end - start) / (1000 * 60 * 60 * 24 * 365);
}

function generateRecommendations(issues) {
  const recommendations = [];
  issues.forEach(issue => {
    if (issue.includes('keyword')) {
      recommendations.push('Add missing keywords naturally in your experience bullets');
    }
    if (issue.includes('metrics')) {
      recommendations.push('Quantify your achievements with specific numbers and percentages');
    }
    if (issue.includes('skills')) {
      recommendations.push('List all relevant technical skills explicitly in your Skills section');
    }
    if (issue.includes('headers')) {
      recommendations.push('Use standard section headers: Professional Experience, Education, Technical Skills');
    }
  });
  return [...new Set(recommendations)]; // Remove duplicates
}

---

### 7. SIDE-BY-SIDE COMPARISON VIEW

**Show before/after with highlighting:**
```javascript
function ResumeComparison({ original, optimized, jobAnalysis }) {
  const [view, setView] = useState('split'); // 'split', 'original', 'optimized'
  
  // Highlight changes and improvements
  const highlightKeywords = (text, keywords) => {
    let highlighted = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    return highlighted;
  };
  
  return (
    <div className="comparison-container">
      <div className="controls">
        <button onClick={() => setView('split')}>Split View</button>
        <button onClick={() => setView('original')}>Original Only</button>
        <button onClick={() => setView('optimized')}>Optimized Only</button>
      </div>
      
      <div className={`view-${view}`}>
        {(view === 'split' || view === 'original') && (
          <div className="original-resume">
            <h3>Original Resume</h3>
            <ResumeDisplay data={original} />
          </div>
        )}
        
        {(view === 'split' || view === 'optimized') && (
          <div className="optimized-resume">
            <h3>Optimized Resume</h3>
            <ResumeDisplay 
              data={optimized} 
              highlightKeywords={jobAnalysis.atsKeywords.critical}
            />
            
            <div className="improvements-panel">
              <h4>Key Improvements:</h4>
              <ul>
                {optimized.optimizationReport.changesApplied.map((change, idx) => (
                  <li key={idx}>{change}</li>
                ))}
              </ul>
              
              <div className="ats-score">
                <h4>ATS Score: {optimized.optimizationReport.atsScore}/100</h4>
                <ProgressBar value={optimized.optimizationReport.atsScore} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 8. USER INTERFACE DESIGN

**Create clean, professional UI:**
```javascript
function ResumeOptimizerApp() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Job Input, 3: Optimization, 4: Results
  const [resumeFile, setResumeFile] = useState(null);
  const [parsedResume, setParsedResume] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analyzedJob, setAnalyzedJob] = useState(null);
  const [optimizedResume, setOptimizedResume] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [atsScore, setAtsScore] = useState(null);
  
  async function handleResumeUpload(file) {
    setIsProcessing(true);
    
    try {
      // Parse resume
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else if (file.type.includes('word')) {
        text = await extractTextFromDOCX(file);
      } else {
        text = await file.text();
      }
      
      const parsed = await parseResumeWithClaude(text, file.name);
      setParsedResume(parsed);
      
      // Save to storage
      await window.storage.set('parsed_resume', JSON.stringify(parsed));
      await window.storage.set('original_resume_text', text);
      
      setStep(2);
    } catch (error) {
      alert('Error parsing resume: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }
  
  async function handleJobSubmit() {
    setIsProcessing(true);
    
    try {
      // Analyze job description
      const analyzed = await analyzeJobDescription(jobDescription);
      setAnalyzedJob(analyzed);
      
      setStep(3);
      
      // Automatically start optimization
      await handleOptimize(analyzed);
      
    } catch (error) {
      alert('Error analyzing job: ' + error.message);
      setIsProcessing(false);
    }
  }
  
  async function handleOptimize(jobAnalysis = analyzedJob) {
    try {
      // Optimize resume
      const optimized = await optimizeResumeForJob(parsedResume, jobAnalysis);
      setOptimizedResume(optimized);
      
      // Calculate ATS score
      const score = calculateATSScore(optimized.optimizedResume, jobAnalysis);
      setAtsScore(score);
      
      // Save to storage
      await window.storage.set('optimized_resume', JSON.stringify(optimized));
      await window.storage.set('ats_score', JSON.stringify(score));
      
      setStep(4);
    } catch (error) {
      alert('Error optimizing resume: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }
  
  async function handleDownloadPDF() {
    const pdfBlob = await generateATSFriendlyPDF(optimizedResume);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${parsedResume.personalInfo.name.replace(/\s+/g, '_')}_Resume_Optimized.pdf`;
    a.click();
  }
  
  function handleDownloadHTML() {
    const html = generateHTMLResume(optimizedResume);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${parsedResume.personalInfo.name.replace(/\s+/g, '_')}_Resume_Optimized.html`;
    a.click();
  }
  
  return (
    <div className="app-container">
      <header>
        <h1>AI Resume Optimizer & ATS Checker</h1>
        <p>Get your resume past ATS systems and into human hands</p>
      </header>
      
      {/* Progress Indicator */}
      <div className="progress-steps">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Upload Resume</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Add Job Description</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Optimize</div>
        <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Download</div>
      </div>
      
      {/* Step 1: Resume Upload */}
      {step === 1 && (
        <div className="upload-section">
          <div className="upload-box">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => handleResumeUpload(e.target.files[0])}
              id="resume-upload"
              style={{ display: 'none' }}
            />
            <label htmlFor="resume-upload" className="upload-label">
              <div className="upload-icon">📄</div>
              <div>Click to upload resume</div>
              <div className="file-types">PDF, DOCX, or TXT</div>
            </label>
          </div>
          
          <div className="divider">OR</div>
          
          <button onClick={() => setStep(1.5)}>
            Paste Resume Text
          </button>
        </div>
      )}
      
      {/* Step 2: Job Description */}
      {step === 2 && (
        <div className="job-input-section">
          <h2>Add Target Job Description</h2>
          
          <div className="input-methods">
            <div className="tab-buttons">
              <button className="active">Paste Text</button>
              <button>Enter URL</button>
            </div>
            
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={15}
            />
            
            <button 
              onClick={handleJobSubmit}
              disabled={!jobDescription.trim()}
              className="primary-button"
            >
              Analyze & Optimize
            </button>
          </div>
        </div>
      )}
      
      {/* Step 3: Processing */}
      {step === 3 && isProcessing && (
        <div className="processing-section">
          <div className="spinner"></div>
          <h3>Optimizing Your Resume...</h3>
          <p>Analyzing job requirements and tailoring your resume</p>
          <ul className="processing-steps">
            <li className="completed">✓ Parsed resume structure</li>
            <li className="completed">✓ Analyzed job requirements</li>
            <li className="in-progress">⟳ Optimizing content...</li>
            <li>Calculating ATS score...</li>
            <li>Formatting for maximum compatibility...</li>
          </ul>
        </div>
      )}
      
      {/* Step 4: Results */}
      {step === 4 && optimizedResume && (
        <div className="results-section">
          {/* ATS Score Card */}
          <div className="ats-score-card">
            <h2>ATS Compatibility Score</h2>
            <div className="score-display">
              <div className="score-number">{atsScore.score}</div>
              <div className="score-grade">Grade: {atsScore.grade}</div>
            </div>
            
            <div className="score-details">
              <div className="strengths">
                <h4>✓ Strengths:</h4>
                <ul>
                  {atsScore.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
              
              {atsScore.issues.length > 0 && (
                <div className="issues">
                  <h4>⚠ Areas for Improvement:</h4>
                  <ul>
                    {atsScore.issues.map((i, idx) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          {/* Optimization Report */}
          <div className="optimization-report">
            <h3>Changes Applied:</h3>
            <ul>
              {optimizedResume.optimizationReport.changesApplied.map((change, idx) => (
                <li key={idx}>{change}</li>
              ))}
            </ul>
            
            <div className="match-analysis">
              <h4>Job Match Analysis:</h4>
              <div className="match-grid">
                <div>Required Skills Covered: {optimizedResume.optimizationReport.matchAnalysis.requiredSkillsCovered}</div>
                <div>Preferred Skills Covered: {optimizedResume.optimizationReport.matchAnalysis.preferredSkillsCovered}</div>
                <div>Experience Alignment: {optimizedResume.optimizationReport.matchAnalysis.experienceAlignment}</div>
                <div>Keyword Density: {optimizedResume.optimizationReport.matchAnalysis.keywordDensity}</div>
              </div>
            </div>
          </div>
          
          {/* Side-by-Side Comparison */}
          <ResumeComparison
            original={parsedResume}
            optimized={optimizedResume}
            jobAnalysis={analyzedJob}
          />
          
          {/* Download Buttons */}
          <div className="download-section">
            <h3>Download Your Optimized Resume</h3>
            <div className="download-buttons">
              <button onClick={handleDownloadPDF} className="primary-button">
                Download as PDF
              </button>
              <button onClick={handleDownloadHTML} className="secondary-button">
                Download as HTML (for editing)
              </button>
              <button onClick={() => navigator.clipboard.writeText(
                JSON.stringify(optimizedResume.optimizedResume, null, 2)
              )} className="secondary-button">
                Copy as JSON
              </button>
            </div>
          </div>
          
          {/* Start Over */}
          <button 
            onClick={() => {
              setStep(1);
              setParsedResume(null);
              setOptimizedResume(null);
              setAtsScore(null);
            }}
            className="tertiary-button"
          >
            Optimize for Another Job
          </button>
        </div>
      )}
      
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="loading-overlay">
          <div className="spinner-large"></div>
        </div>
      )}
    </div>
  );
}
```

---

### 9. ADVANCED FEATURES

**Add these enhancements:**

**A. Multi-Job Optimization:**
```javascript
async function optimizeForMultipleJobs(parsedResume, jobDescriptions) {
  const results = [];
  
  for (const jobDesc of jobDescriptions) {
    const analyzed = await analyzeJobDescription(jobDesc);
    const optimized = await optimizeResumeForJob(parsedResume, analyzed);
    results.push({
      job: analyzed.jobTitle,
      company: analyzed.company,
      optimizedResume: optimized,
      atsScore: calculateATSScore(optimized.optimizedResume, analyzed)
    });
  }
  
  // Create a "universal" version that works for all
  const universalResume = await createUniversalResume(parsedResume, results);
  
  return { individual: results, universal: universalResume };
}
```

**B. Resume Templates:**
```javascript
const templates = {
  technical: {
    sectionsOrder: ['Summary', 'Skills', 'Experience', 'Projects', 'Education'],
    emphasize: 'technical skills and projects'
  },
  management: {
    sectionsOrder: ['Summary', 'Experience', 'Education', 'Skills'],
    emphasize: 'leadership and business impact'
  },
  creative: {
    sectionsOrder: ['Summary', 'Portfolio', 'Experience', 'Skills', 'Education'],
    emphasize: 'projects and creative work'
  },
  academic: {
    sectionsOrder: ['Education', 'Research', 'Publications', 'Experience', 'Skills'],
    emphasize: 'research and publications'
  }
};
```

**C. Keyword Density Analyzer:**
```javascript
function analyzeKeywordDensity(resumeText, targetKeywords) {
  const words = resumeText.toLowerCase().split(/\s+/);
  const totalWords = words.length;
  
  const keywordStats = targetKeywords.map(keyword => {
    const count = (resumeText.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    const density = (count / totalWords) * 100;
    
    return {
      keyword,
      count,
      density: density.toFixed(2) + '%',
      status: count === 0 ? 'missing' : count < 2 ? 'low' : count > 5 ? 'high' : 'optimal'
    };
  });
  
  return keywordStats;
}
```

**D. Industry-Specific Optimization:**
```javascript
const industryRules = {
  'tech': {
    keywords: ['agile', 'CI/CD', 'microservices', 'cloud', 'scalability'],
    tonePreference: 'technical and precise',
    sectionsOrder: ['Skills', 'Experience', 'Projects', 'Education']
  },
  'finance': {
    keywords: ['compliance', 'regulatory', 'risk management', 'audit'],
    tonePreference: 'formal and detail-oriented',
    sectionsOrder: ['Experience', 'Education', 'Certifications', 'Skills']
  },
  'healthcare': {
    keywords: ['HIPAA', 'patient care', 'clinical', 'healthcare systems'],
    tonePreference: 'professional and empathetic',
    sectionsOrder: ['Certifications', 'Experience', 'Education', 'Skills']
  }
};
```

---

### 10. QUALITY ASSURANCE CHECKS

**Implement rigorous QA before PDF generation:**
```javascript
function runQualityChecks(optimizedResume) {
  const issues = [];
  const warnings = [];
  
  // Check for common ATS problems
  if (JSON.stringify(optimizedResume).includes('|') || JSON.stringify(optimizedResume).includes('/')) {
    warnings.push('Uses special characters that may confuse ATS');
  }
  
  // Check for length
  const totalText = JSON.stringify(optimizedResume.optimizedResume);
  if (totalText.length < 2000) {
    warnings.push('Resume may be too short (under 1 page equivalent)');
  } else if (totalText.length > 8000) {
    warnings.push('Resume may be too long (over 2 pages)');
  }
  
  // Check for quantification
  const achievements = optimizedResume.optimizedResume.experiences.flatMap(exp => 
    exp.achievements || []
  );
  const quantified = achievements.filter(ach => /\d+/.test(typeof ach === 'string' ? ach : ach.text));
  
  if (quantified.length / achievements.length < 0.5) {
    issues.push('Less than 50% of achievements are quantified');
  }
  
  // Check for contact information
  const contact = optimizedResume.optimizedResume.personalInfo;
  if (!contact.email || !contact.phone) {
    issues.push('Missing critical contact information');
  }
  
  // Check for dates
  const experiences = optimizedResume.optimizedResume.experiences;
  experiences.forEach((exp, idx) => {
    if (!exp.startDate || !exp.endDate) {
      issues.push(`Experience #${idx + 1} missing dates`);
    }
  });
  
  // Check for action verbs
  const weakVerbs = ['responsible for', 'worked on', 'helped with', 'assisted'];
  experiences.forEach(exp => {
    (exp.responsibilities || []).forEach(resp => {
      weakVerbs.forEach(weak => {
        if (resp.toLowerCase().includes(weak)) {
          warnings.push(`Consider replacing weak phrase "${weak}" with strong action verb`);
        }
      });
    });
  });
  
  return { issues, warnings, passed: issues.length === 0 };
}
```

---

## IMPLEMENTATION CHECKLIST

- [ ] Set up file upload and parsing (PDF, DOCX, TXT)
- [ ] Implement Claude API integration for parsing
- [ ] Build job description analyzer
- [ ] Create resume optimization engine
- [ ] Implement ATS score calculator
- [ ] Build PDF generation (jsPDF)
- [ ] Build HTML generation for editing
- [ ] Create side-by-side comparison view
- [ ] Add keyword highlighting
- [ ] Implement quality checks
- [ ] Create download functionality
- [ ] Add multi-job optimization
- [ ] Build responsive UI
- [ ] Add persistent storage for resume history
- [ ] Implement error handling throughout
- [ ] Test with multiple resume formats
- [ ] Test PDF output in multiple ATS systems
- [ ] Add export to DOCX functionality

---

## TESTING REQUIREMENTS

**Test the system with:**

1. **Various resume formats** - PDF (scanned and digital), DOCX (different Word versions), plain text
2. **Different resume styles** - Traditional, modern, creative, academic
3. **Multiple job types** - Tech, finance, healthcare, creative, management
4. **Edge cases** - Very long resumes (3+ pages), very short (half page), international formats
5. **ATS systems** - Test PDFs in Workday, Greenhouse, Lever, Taleo

**Success Criteria:**
- Parser extracts 100% of resume content accurately
- Optimized resumes score 85+ on ATS compatibility
- PDF output is pixel-perfect with no formatting errors
- Keywords are naturally integrated, not stuffed
- All dates, numbers, and contact info are preserved accurately

---

## CRITICAL NOTES

1. **Never fabricate information** - Only reframe, reorder, and emphasize existing content
2. **Preserve all factual data** - Dates, companies, titles must remain accurate (±1 month max)
3. **PDF must be flawless** - No overlapping text, cut-off content, or formatting glitches
4. **ATS-first approach** - When in doubt, choose simpler formatting
5. **Natural keyword integration** - Keywords must flow naturally, not feel forced
6. **Test every PDF** - Always verify PDF output before allowing download
7. **Maintain user control** - Allow editing of optimized content before finalizing

---

**BUILD THIS AS A PRODUCTION-READY TOOL THAT ACTUALLY HELPS PEOPLE GET JOBS!**