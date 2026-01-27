/**
 * Claude API Service
 * Handles communication with Claude API for content generation, parsing, and optimization
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Get API key from localStorage
 */
function getApiKey() {
    return localStorage.getItem('claude_api_key');
}

/**
 * Check if API key is configured
 */
export function isConfigured() {
    return !!getApiKey();
}

/**
 * Make a request to Claude API
 */
async function callClaude(prompt, maxTokens = 4096) {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error('Claude API key not configured. Please add it in Settings.');
    }

    try {
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                max_tokens: maxTokens,
                messages: [
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Claude API request failed');
        }

        const data = await response.json();
        return data.content[0].text;
    } catch (error) {
        console.error('Claude API Error:', error);
        throw error;
    }
}

/**
 * Helper to extract JSON from Claude's response
 */
function extractJSON(text) {
    try {
        // Try finding JSON block first
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
        // Fallback to parsing whole text
        return JSON.parse(text);
    } catch (error) {
        console.error('JSON Extraction Failed:', error);
        throw new Error('Failed to parse AI response as JSON');
    }
}

/**
 * Parse resume text into deep structured data
 */
export async function parseResumeDeep(resumeText, fileName = 'resume') {
    const prompt = `You are an expert resume parser. Extract ALL information from this resume with perfect accuracy. Return ONLY valid JSON with no markdown formatting.

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

Parse with extreme attention to detail. Do not miss anything.`;

    const result = await callClaude(prompt, 6000);
    return extractJSON(result);
}

/**
 * Analyze Job Description
 */
export async function analyzeJobDescription(jobDescriptionText) {
    const prompt = `Analyze this job description in extreme detail for resume optimization. Return ONLY valid JSON.

{
  "jobTitle": "Exact job title",
  "company": "Company name",
  "location": "Location",
  "employmentType": "Full-time/Contract/etc",
  "experienceLevel": "Entry/Mid/Senior/Lead/Principal",
  "salaryRange": "If mentioned",
  
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
${jobDescriptionText}

Analyze for maximum ATS compatibility and keyword optimization.`;

    const result = await callClaude(prompt, 4000);
    return extractJSON(result);
}

/**
 * Optimization Engine
 */
export async function optimizeResumeForJob(parsedResume, analyzedJob) {
    const prompt = `You are an expert resume optimizer and ATS specialist. Transform this resume to be PERFECTLY optimized for the target job while maintaining complete truthfulness.

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
      "Reordered experiences...",
      "Added critical keywords..."
    ],
    "atsScore": 98,
    "atsIssuesFixed": [
      "Simplified formatting",
      "Standardized section headers"
    ],
    "matchAnalysis": {
      "requiredSkillsCovered": "15/15",
      "preferredSkillsCovered": "8/10",
      "experienceAlignment": "Excellent",
      "keywordDensity": "Optimal"
    },
    "suggestions": [
      "Suggestion 1",
      "Suggestion 2"
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

Generate the BEST possible resume for this job while staying 100% truthful.`;

    const result = await callClaude(prompt, 8000);
    return extractJSON(result);
}

/**
 * Test API connection
 */
export async function testConnection() {
    try {
        const result = await callClaude('Respond with exactly: "Connection successful"', 50);
        return { success: true, message: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
