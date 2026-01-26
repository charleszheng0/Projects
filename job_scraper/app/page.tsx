"use client";

import { useEffect, useMemo, useState } from "react";
import { getJson, setJson, setString } from "../lib/storage";

type Experience = {
  title: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  achievements?: string[];
  skills?: string[];
};

type UserProfile = {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  experiences: Experience[];
  education?: Array<{
    degree?: string;
    school?: string;
    graduationDate?: string;
    gpa?: string;
  }>;
  skills?: {
    technical?: string[];
    languages?: string[];
    tools?: string[];
  };
  projects?: Array<{
    name?: string;
    description?: string;
    technologies?: string[];
    url?: string;
  }>;
  rawResumeText?: string;
  preferences?: Preferences;
};

type Preferences = {
  targetRoles: string[];
  targetIndustries: string[];
  location: string;
  remote: boolean;
};

type EmailConfig = {
  service: "emailjs" | "mailto";
  serviceId: string;
  templateId: string;
  publicKey: string;
  fromEmail: string;
  fromName: string;
};

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

type JobPosting = {
  title: string;
  company: string;
  location?: string;
  isRemote?: boolean;
  salary?: string;
  description?: string;
  requirements?: string[];
  requiredSkills?: string[];
  niceToHaveSkills?: string[];
  applyUrl?: string;
  companyWebsite?: string;
  contactEmail?: string;
  postedDate?: string;
  employmentType?: string;
  matchScore?: number;
  urgencyFlag?: string;
};

type ResumeVariant = {
  id: string;
  text: string;
  jobTitle: string;
  company: string;
};

type ApplicationResult = {
  success: boolean;
  method: string;
  sentTo?: string;
  applyUrl?: string;
  mailtoLink?: string;
  formData?: Record<string, unknown>;
  message?: string;
  error?: string;
};

type ApplicationLog = {
  id: string;
  timestamp: string;
  company: string;
  role: string;
  jobUrl?: string;
  location?: string;
  salary?: string;
  resumeVariantId: string;
  coverLetterPreview: string;
  method: string;
  sentTo?: string;
  success: boolean;
  error?: string;
  status: string;
  responseDate: string | null;
  interviewDate: string | null;
  notes: string;
  score?: number;
  urgencyFlag?: string;
};

const defaultPreferences: Preferences = {
  targetRoles: ["Full-Stack Engineer", "Backend Engineer"],
  targetIndustries: ["AI", "Fintech"],
  location: "Remote",
  remote: true
};

const defaultEmailConfig: EmailConfig = {
  service: "mailto",
  serviceId: "",
  templateId: "",
  publicKey: "",
  fromEmail: "",
  fromName: ""
};

const defaultKpis = {
  applications: 0,
  responseRate: 0,
  interviewRate: 0,
  offerRate: 0
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(defaultEmailConfig);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [resumeParseError, setResumeParseError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [applying, setApplying] = useState(false);
  const [discoveredJobs, setDiscoveredJobs] = useState<JobPosting[]>([]);
  const [applicationResults, setApplicationResults] = useState<ApplicationResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [kpis, setKpis] = useState(defaultKpis);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const storedProfile = getJson<UserProfile | null>("user_profile", null);
    const storedPreferences = getJson<Preferences>("user_preferences", defaultPreferences);
    const storedEmailConfig = getJson<EmailConfig>("email_config", defaultEmailConfig);
    const storedStats = getJson("application_stats", defaultKpis);

    if (storedProfile) {
      setProfile(storedProfile);
    }
    setPreferences(storedPreferences);
    setEmailConfig(storedEmailConfig);
    setKpis(storedStats);
  }, []);

  const sourceTags = useMemo(() => {
    const sources = discoveredJobs
      .map((job) => job.companyWebsite)
      .filter(Boolean) as string[];
    return Array.from(new Set(sources));
  }, [discoveredJobs]);

  async function parseResumeFile(file: File) {
    setResumeParseError(null);
    setResumeParsing(true);

    try {
      let text = "";

      if (file.type === "application/pdf") {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
        const pdf = await loadingTask.promise;
        const pages = [];
        for (let i = 1; i <= pdf.numPages; i += 1) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          pages.push(
            (content.items as Array<{ str?: string }>).map((item) => item.str ?? "")
              .join(" ")
          );
        }
        text = pages.join("\n");
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const mammoth = await import("mammoth/mammoth.browser");
        const result = await mammoth.extractRawText({
          arrayBuffer: await file.arrayBuffer()
        });
        text = result.value;
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        throw new Error("No resume text extracted.");
      }

      const structuredData = await parseResumeWithClaude(text);
      structuredData.rawResumeText = text;
      structuredData.preferences = preferences;
      setProfile(structuredData);
      setJson("user_profile", structuredData);
      setString("user_resume_raw", text);
      setStatusMessage("Resume parsed and saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Parsing failed.";
      setResumeParseError(message);
    } finally {
      setResumeParsing(false);
    }
  }

  async function parseResumeWithClaude(resumeText: string) {
    const prompt = `Parse this resume and extract structured data. Return ONLY valid JSON with no markdown formatting or preamble:

{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "location": "City, State",
  "linkedin": "URL",
  "github": "URL",
  "summary": "Professional summary",
  "experiences": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, State",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or Present",
      "description": "What they did",
      "achievements": ["Achievement 1", "Achievement 2"],
      "skills": ["Skill1", "Skill2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "school": "University Name",
      "graduationDate": "YYYY",
      "gpa": "X.XX"
    }
  ],
  "skills": {
    "technical": ["Skill1", "Skill2"],
    "languages": ["Language1", "Language2"],
    "tools": ["Tool1", "Tool2"]
  },
  "projects": [
    {
      "name": "Project Name",
      "description": "What it does",
      "technologies": ["Tech1", "Tech2"],
      "url": "github.com/..."
    }
  ]
}

Resume text:
${resumeText}`;

    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "parseResume", prompt, maxTokens: 4000 })
    });

    if (!response.ok) {
      throw new Error("Resume parsing failed. Check API settings.");
    }

    const data = await response.json();
    const jsonText = (data.text as string).replace(/```json|```/g, "").trim();
    return JSON.parse(jsonText) as UserProfile;
  }

  async function executeWebSearch(query: string): Promise<SearchResult[]> {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.results ?? [];
  }

  async function fetchFullContent(url: string) {
    const response = await fetch("/api/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    return data.content ?? "";
  }

  async function extractJobData(content: string, url: string, title?: string) {
    const prompt = `Extract job posting details from this content. Return ONLY valid JSON:

{
  "title": "Job title",
  "company": "Company name",
  "location": "City, State or Remote",
  "isRemote": true/false,
  "salary": "Salary range if mentioned",
  "description": "Brief job description",
  "requirements": ["Requirement 1", "Requirement 2"],
  "requiredSkills": ["Skill1", "Skill2"],
  "niceToHaveSkills": ["Skill1", "Skill2"],
  "applyUrl": "Application URL",
  "companyWebsite": "Company website",
  "contactEmail": "Contact email if found",
  "postedDate": "When posted",
  "employmentType": "Full-time/Contract/etc"
}

If this doesn't look like a job posting, return null.

Content:
Title: ${title ?? ""}
URL: ${url}
${content.substring(0, 5000)}`;

    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extractJob", prompt, maxTokens: 2000 })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const text = (data.text as string).replace(/```json|```/g, "").trim();
    if (text === "null") return null;

    try {
      return JSON.parse(text) as JobPosting;
    } catch {
      return null;
    }
  }

  async function parseJobListings(results: SearchResult[]) {
    const jobs: JobPosting[] = [];

    for (const result of results) {
      let fullContent = result.snippet || "";
      if (result.url) {
        const fetched = await fetchFullContent(result.url);
        if (fetched) {
          fullContent = fetched;
        }
      }
      const jobData = await extractJobData(fullContent, result.url, result.title);
      if (jobData?.title && jobData?.company) {
        jobs.push(jobData);
      }
    }

    return jobs;
  }

  function calculateMatchScore(job: JobPosting, userProfile: UserProfile) {
    const skills = [
      ...(userProfile.skills?.technical ?? []),
      ...(userProfile.skills?.tools ?? []),
      ...(userProfile.skills?.languages ?? [])
    ].map((skill) => skill.toLowerCase());

    const required = (job.requiredSkills ?? []).map((skill) => skill.toLowerCase());
    const nice = (job.niceToHaveSkills ?? []).map((skill) => skill.toLowerCase());
    const matches =
      required.filter((skill) => skills.includes(skill)).length * 3 +
      nice.filter((skill) => skills.includes(skill)).length;
    const score = Math.min(100, Math.round(matches * 10));
    return score;
  }

  async function searchForJobs(userProfile: UserProfile, prefs: Preferences) {
    const searches: string[] = [];

    for (const role of prefs.targetRoles) {
      searches.push(
        `${role} jobs ${prefs.remote ? "remote" : prefs.location} site:linkedin.com/jobs`,
        `${role} ${prefs.location} site:indeed.com`,
        `${role} startup site:angel.co/jobs`,
        `${role} site:ycombinator.com/jobs`,
        `${role} "posted today" OR "posted yesterday" ${prefs.location}`
      );
    }

    for (const industry of prefs.targetIndustries) {
      searches.push(
        `"series A" OR "raises" ${industry} ${new Date().getFullYear()}`,
        `"announces funding" ${industry} site:techcrunch.com`
      );
    }

    const allResults: SearchResult[] = [];

    for (let i = 0; i < searches.length; i += 3) {
      const batch = searches.slice(i, i + 3);
      const batchResults = await Promise.all(batch.map(executeWebSearch));
      allResults.push(...batchResults.flat());
      await sleep(2000);
    }

    const jobs = await parseJobListings(allResults);
    return jobs.map((job) => ({
      ...job,
      matchScore: calculateMatchScore(job, userProfile)
    }));
  }

  async function generateCustomResume(userProfile: UserProfile, jobPosting: JobPosting) {
    const prompt = `Given the user's profile and this job posting, generate a customized resume in plain text format that emphasizes relevant experience and skills.

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

JOB POSTING:
Title: ${jobPosting.title}
Company: ${jobPosting.company}
Requirements: ${(jobPosting.requirements ?? []).join(", ")}
Required Skills: ${(jobPosting.requiredSkills ?? []).join(", ")}
Description: ${jobPosting.description}

INSTRUCTIONS:
1. Reorder experiences to put most relevant first
2. Emphasize achievements that match job requirements
3. Highlight skills that match required/nice-to-have skills
4. Adjust summary to align with this specific role
5. Use keywords from the job posting naturally
6. Keep it concise (1 page equivalent)
7. Format as professional plain text resume

Return the complete resume text:`;

    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generateResume", prompt, maxTokens: 3000 })
    });

    if (!response.ok) {
      throw new Error("Resume generation failed.");
    }

    const data = await response.json();
    const resumeText = data.text as string;
    const variantId = `resume_${jobPosting.company}_${Date.now()}`;

    const variants = getJson<Record<string, string>>("resume_variants", {});
    variants[variantId] = resumeText;
    setJson("resume_variants", variants);

    return {
      id: variantId,
      text: resumeText,
      jobTitle: jobPosting.title,
      company: jobPosting.company
    } as ResumeVariant;
  }

  async function generateCoverLetter(
    userProfile: UserProfile,
    jobPosting: JobPosting,
    contextualHook: string
  ) {
    const prompt = `Write a compelling cover letter for this job application.

USER PROFILE:
Name: ${userProfile.name}
Current/Most Recent Role: ${userProfile.experiences?.[0]?.title ?? "N/A"} at ${
      userProfile.experiences?.[0]?.company ?? "N/A"
    }
Key Skills: ${(userProfile.skills?.technical ?? []).slice(0, 5).join(", ")}
Notable Achievement: ${userProfile.experiences?.[0]?.achievements?.[0] ?? "N/A"}

JOB DETAILS:
Company: ${jobPosting.company}
Role: ${jobPosting.title}
Key Requirements: ${(jobPosting.requirements ?? []).slice(0, 3).join(", ")}

CONTEXTUAL HOOK (use this to open):
${contextualHook}

Write a professional but engaging cover letter that:
1. Opens with the contextual hook
2. Demonstrates genuine interest in the company/role
3. Highlights 2-3 most relevant experiences/achievements
4. Shows how user can add value specifically to this role
5. Closes with enthusiasm and call to action
6. Keep it under 300 words
7. Sound authentic, not overly formal

Return just the cover letter text:`;

    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generateCoverLetter", prompt, maxTokens: 1500 })
    });

    if (!response.ok) {
      throw new Error("Cover letter generation failed.");
    }

    const data = await response.json();
    return data.text as string;
  }

  async function generateWhyThisRole(jobPosting: JobPosting, userProfile: UserProfile) {
    const prompt = `Write a brief (50-75 word) answer to "Why are you interested in this role?" for:

Company: ${jobPosting.company}
Role: ${jobPosting.title}
User's background: ${userProfile.experiences?.[0]?.title ?? ""} with ${(userProfile.skills?.technical ?? [])
      .slice(0, 3)
      .join(", ")}

Be specific and genuine:`;

    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generateWhyThisRole", prompt, maxTokens: 300 })
    });

    if (!response.ok) {
      return "I'm excited about the role and believe my background aligns with your mission.";
    }

    const data = await response.json();
    return data.text as string;
  }

  function getCompanyDomain(companyWebsite?: string) {
    if (!companyWebsite) return "";
    try {
      return new URL(companyWebsite).hostname.replace("www.", "");
    } catch {
      return "";
    }
  }

  function generateMailtoLink(
    jobPosting: JobPosting,
    resume: ResumeVariant,
    coverLetter: string,
    userProfile: UserProfile
  ) {
    const recipientEmail =
      jobPosting.contactEmail ||
      (getCompanyDomain(jobPosting.companyWebsite)
        ? `careers@${getCompanyDomain(jobPosting.companyWebsite)}`
        : "");
    const subject = encodeURIComponent(
      `Application for ${jobPosting.title} - ${userProfile.name}`
    );
    const body = encodeURIComponent(`${coverLetter}\n\n---\n\nRESUME:\n\n${resume.text}`);
    return `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
  }

  async function sendApplicationEmail(
    jobPosting: JobPosting,
    resume: ResumeVariant,
    coverLetter: string,
    userProfile: UserProfile
  ): Promise<ApplicationResult> {
    const recipientEmail =
      jobPosting.contactEmail ||
      (getCompanyDomain(jobPosting.companyWebsite)
        ? `careers@${getCompanyDomain(jobPosting.companyWebsite)}`
        : "");

    if (!recipientEmail) {
      return { success: false, method: "email", error: "No contact email found" };
    }

    const emailBody = `
${coverLetter}

---

I've attached my resume for your review. I'm very excited about the opportunity to contribute to ${
      jobPosting.company
    } and would love to discuss how my experience aligns with your needs.

Best regards,
${userProfile.name}
${userProfile.email}
${userProfile.phone ?? ""}
${userProfile.linkedin ? `\nLinkedIn: ${userProfile.linkedin}` : ""}
${userProfile.github ? `\nGitHub: ${userProfile.github}` : ""}

---

RESUME:

${resume.text}
  `.trim();

    if (emailConfig.service === "emailjs") {
      if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
        return { success: false, method: "email", error: "EmailJS not configured." };
      }

      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: emailConfig.serviceId,
          template_id: emailConfig.templateId,
          user_id: emailConfig.publicKey,
          template_params: {
            to_email: recipientEmail,
            from_name: emailConfig.fromName || userProfile.name,
            from_email: emailConfig.fromEmail || userProfile.email,
            subject: `Application for ${jobPosting.title} - ${userProfile.name}`,
            message: emailBody,
            reply_to: userProfile.email
          }
        })
      });

      if (response.ok) {
        return { success: true, method: "email", sentTo: recipientEmail };
      }

      return { success: false, method: "email", error: "Email service error" };
    }

    return {
      success: true,
      method: "mailto",
      sentTo: recipientEmail,
      mailtoLink: generateMailtoLink(jobPosting, resume, coverLetter, userProfile),
      message: "Click mailto link to send via your email client."
    };
  }

  async function generateApplicationFormData(
    jobPosting: JobPosting,
    userProfile: UserProfile,
    resume: ResumeVariant,
    coverLetter: string
  ) {
    return {
      fullName: userProfile.name,
      email: userProfile.email,
      phone: userProfile.phone,
      location: userProfile.location,
      linkedinUrl: userProfile.linkedin,
      githubUrl: userProfile.github,
      resumeText: resume.text,
      coverLetterText: coverLetter,
      whyThisRole: await generateWhyThisRole(jobPosting, userProfile),
      startDate: "Immediately",
      remotePreference: preferences.remote ? "Remote" : "On-site",
      currentCompany: userProfile.experiences?.[0]?.company,
      currentTitle: userProfile.experiences?.[0]?.title,
      instructions: `APPLICATION DATA FOR: ${jobPosting.company} - ${
        jobPosting.title
      }\n\n${jobPosting.applyUrl ?? "No direct application URL found"}`
    };
  }

  async function logApplication(
    jobPosting: JobPosting,
    resume: ResumeVariant,
    coverLetter: string,
    applicationResult: ApplicationResult
  ) {
    const application: ApplicationLog = {
      id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      company: jobPosting.company,
      role: jobPosting.title,
      jobUrl: jobPosting.applyUrl,
      location: jobPosting.location,
      salary: jobPosting.salary,
      resumeVariantId: resume.id,
      coverLetterPreview: coverLetter.substring(0, 200),
      method: applicationResult.method,
      sentTo: applicationResult.sentTo,
      success: applicationResult.success,
      error: applicationResult.error,
      status: "sent",
      responseDate: null,
      interviewDate: null,
      notes: "",
      score: jobPosting.matchScore,
      urgencyFlag: jobPosting.urgencyFlag
    };

    const applications = getJson<ApplicationLog[]>("applications", []);
    applications.push(application);
    setJson("applications", applications);

    const stats = getJson("application_stats", defaultKpis);
    const totalApplications = (stats.applications ?? 0) + 1;
    const updatedStats = {
      ...stats,
      applications: totalApplications
    };
    setJson("application_stats", updatedStats);
    setKpis(updatedStats);

    return application;
  }

  async function applyToJob(jobPosting: JobPosting, userProfile: UserProfile) {
    const customResume = await generateCustomResume(userProfile, jobPosting);
    const coverLetter = await generateCoverLetter(
      userProfile,
      jobPosting,
      "I was excited to see your recent momentum in the market. "
    );

    let applicationResult: ApplicationResult;

    if (jobPosting.contactEmail || emailConfig.service === "emailjs") {
      applicationResult = await sendApplicationEmail(
        jobPosting,
        customResume,
        coverLetter,
        userProfile
      );
      applicationResult.method = applicationResult.method || "email";
    } else if (jobPosting.applyUrl) {
      const formData = await generateApplicationFormData(
        jobPosting,
        userProfile,
        customResume,
        coverLetter
      );
      applicationResult = {
        success: true,
        method: "form",
        formData,
        applyUrl: jobPosting.applyUrl,
        message: "Form data generated - follow instructions to apply."
      };
    } else {
      applicationResult = {
        success: false,
        method: "manual",
        message: "No direct application method found."
      };
    }

    await logApplication(jobPosting, customResume, coverLetter, applicationResult);

    return {
      result: applicationResult,
      resume: customResume,
      coverLetter
    };
  }

  async function applyToMultipleJobs(jobs: JobPosting[], userProfile: UserProfile) {
    const results: ApplicationResult[] = [];
    const total = Math.min(jobs.length, 10);
    setProgress({ current: 0, total });

    for (let i = 0; i < total; i += 1) {
      const job = jobs[i];
      const outcome = await applyToJob(job, userProfile);
      results.push(outcome.result);
      setApplicationResults((prev) => [...prev, outcome.result]);
      setProgress({ current: i + 1, total });
      await sleep(5000);
    }

    return results;
  }

  async function handleStartAutomation() {
    if (!profile) {
      setStatusMessage("Upload a resume first.");
      return;
    }

    setSearching(true);
    setStatusMessage("Searching for jobs...");
    const jobs = await searchForJobs(profile, preferences);
    const scored = jobs
      .filter((job) => (job.matchScore ?? 0) >= 70)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    setDiscoveredJobs(scored);
    setSearching(false);

    if (scored.length === 0) {
      setStatusMessage("No high-fit roles found yet.");
      return;
    }

    setApplying(true);
    setStatusMessage("Applying to top matches...");
    await applyToMultipleJobs(scored, profile);
    setApplying(false);
    setStatusMessage("Automation complete.");
  }

  function handleSavePreferences() {
    setJson("user_preferences", preferences);
    if (profile) {
      const updatedProfile = { ...profile, preferences };
      setProfile(updatedProfile);
      setJson("user_profile", updatedProfile);
    }
    setStatusMessage("Preferences saved.");
  }

  function handleSaveEmailConfig() {
    setJson("email_config", emailConfig);
    setStatusMessage("Email configuration saved.");
  }

  return (
    <>
      <header className="site-header">
        <div className="container header-row">
          <div className="brand">
            <span className="logo">AJH</span>
            <div>
              <p className="brand-name">Autonomous Job Hunter</p>
              <p className="brand-subtitle">
                Discovery, personalization, and automated outreach.
              </p>
            </div>
          </div>
          <nav className="nav">
            <a href="#overview">Overview</a>
            <a href="#automation-console">Automation</a>
            <a href="#analytics">Analytics</a>
            <a href="#schema">Data</a>
          </nav>
          <button className="primary-btn">Request Demo</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <p className="eyebrow">Autonomous job hunting system</p>
              <h1>Find high-signal roles, tailor resumes, and apply at scale.</h1>
              <p className="lead">
                AJH unifies multi-source scraping, opportunity scoring, adaptive resume
                creation, and outreach automation with built-in guardrails.
              </p>
              <div className="hero-actions">
                <button className="primary-btn" onClick={handleStartAutomation}>
                  Start automation
                </button>
                <button className="ghost-btn">View workflow</button>
              </div>
              <div className="hero-metrics">
                <div>
                  <h3>20%</h3>
                  <p>Top priority roles auto-applied daily</p>
                </div>
                <div>
                  <h3>6 hrs</h3>
                  <p>Funding-event response SLA</p>
                </div>
                <div>
                  <h3>100+</h3>
                  <p>Applications/day cap with rate limits</p>
                </div>
              </div>
            </div>
            <div className="hero-card">
              <h2>Automation status</h2>
              <div className="status-pill success">{searching ? "Searching" : "Ready"}</div>
              <div className="status-pill warning">
                {applying ? "Applying" : "Idle"}
              </div>
              <div className="status-pill info">{discoveredJobs.length} roles found</div>
              <div className="timeline">
                <div className="timeline-item">
                  <span>Status</span>
                  <p>{statusMessage || "Awaiting action"}</p>
                </div>
                <div className="timeline-item">
                  <span>Progress</span>
                  <p>
                    {progress.current}/{progress.total} applications
                  </p>
                </div>
              </div>
              {progress.total > 0 && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.round((progress.current / progress.total) * 100)}%`
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="automation-console" className="section soft-bg">
          <div className="container">
            <div className="section-heading">
              <h2>Automation console</h2>
              <p>Upload a resume, configure preferences, and launch the job hunt.</p>
            </div>
            <div className="console-grid">
              <div className="panel">
                <h3>Resume intake</h3>
                <p>Upload PDF, DOCX, or TXT to build your profile.</p>
                <input
                  className="input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      parseResumeFile(file);
                    }
                  }}
                  disabled={resumeParsing}
                />
                {resumeParsing && <p className="status">Parsing resume...</p>}
                {resumeParseError && <p className="status error">{resumeParseError}</p>}
                {profile && (
                  <div className="status success">
                    Profile loaded for {profile.name || "Candidate"}.
                  </div>
                )}
              </div>

              <div className="panel">
                <h3>Job preferences</h3>
                <label className="field">
                  Target roles (comma separated)
                  <input
                    className="input"
                    value={preferences.targetRoles.join(", ")}
                    onChange={(event) =>
                      setPreferences((prev) => ({
                        ...prev,
                        targetRoles: event.target.value
                          .split(",")
                          .map((role) => role.trim())
                          .filter(Boolean)
                      }))
                    }
                  />
                </label>
                <label className="field">
                  Target industries (comma separated)
                  <input
                    className="input"
                    value={preferences.targetIndustries.join(", ")}
                    onChange={(event) =>
                      setPreferences((prev) => ({
                        ...prev,
                        targetIndustries: event.target.value
                          .split(",")
                          .map((industry) => industry.trim())
                          .filter(Boolean)
                      }))
                    }
                  />
                </label>
                <label className="field">
                  Location
                  <input
                    className="input"
                    value={preferences.location}
                    onChange={(event) =>
                      setPreferences((prev) => ({ ...prev, location: event.target.value }))
                    }
                  />
                </label>
                <label className="field inline">
                  <input
                    type="checkbox"
                    checked={preferences.remote}
                    onChange={(event) =>
                      setPreferences((prev) => ({ ...prev, remote: event.target.checked }))
                    }
                  />
                  Remote only
                </label>
                <button className="ghost-btn" onClick={handleSavePreferences}>
                  Save preferences
                </button>
              </div>

              <div className="panel">
                <h3>Email configuration</h3>
                <label className="field">
                  Service
                  <select
                    className="input"
                    value={emailConfig.service}
                    onChange={(event) =>
                      setEmailConfig((prev) => ({
                        ...prev,
                        service: event.target.value as EmailConfig["service"]
                      }))
                    }
                  >
                    <option value="emailjs">EmailJS (automatic)</option>
                    <option value="mailto">Mailto link (manual)</option>
                  </select>
                </label>
                {emailConfig.service === "emailjs" && (
                  <>
                    <label className="field">
                      Service ID
                      <input
                        className="input"
                        value={emailConfig.serviceId}
                        onChange={(event) =>
                          setEmailConfig((prev) => ({
                            ...prev,
                            serviceId: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      Template ID
                      <input
                        className="input"
                        value={emailConfig.templateId}
                        onChange={(event) =>
                          setEmailConfig((prev) => ({
                            ...prev,
                            templateId: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      Public key
                      <input
                        className="input"
                        value={emailConfig.publicKey}
                        onChange={(event) =>
                          setEmailConfig((prev) => ({
                            ...prev,
                            publicKey: event.target.value
                          }))
                        }
                      />
                    </label>
                  </>
                )}
                <label className="field">
                  From email
                  <input
                    className="input"
                    value={emailConfig.fromEmail}
                    onChange={(event) =>
                      setEmailConfig((prev) => ({ ...prev, fromEmail: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  From name
                  <input
                    className="input"
                    value={emailConfig.fromName}
                    onChange={(event) =>
                      setEmailConfig((prev) => ({ ...prev, fromName: event.target.value }))
                    }
                  />
                </label>
                <button className="ghost-btn" onClick={handleSaveEmailConfig}>
                  Save email config
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="overview" className="section">
          <div className="container">
            <div className="section-heading">
              <h2>Discovered jobs</h2>
              <p>High-fit roles scored and prioritized by the automation engine.</p>
            </div>
            <div className="job-grid">
              {searching && <p>Searching the web for new roles...</p>}
              {!searching && discoveredJobs.length === 0 && (
                <p>No jobs discovered yet. Start the automation to search the web.</p>
              )}
              {discoveredJobs.map((job) => (
                <article key={`${job.company}-${job.title}`} className="job-card">
                  <div className="meta">
                    <span>{job.company}</span>
                    <span className="score">{job.matchScore ?? 0}</span>
                  </div>
                  <h3>{job.title}</h3>
                  <p>
                    {job.location ?? "Location not listed"} · {job.salary ?? "Salary n/a"}
                  </p>
                  <div>
                    {(job.requiredSkills ?? []).slice(0, 3).map((skill) => (
                      <span key={skill} className="tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="meta">
                    <span>{job.applyUrl ? "Direct apply" : "Manual apply"}</span>
                    <span>{job.isRemote ? "Remote" : "On-site"}</span>
                  </div>
                </article>
              ))}
            </div>
            {sourceTags.length > 0 && (
              <p className="footnote">Sources: {sourceTags.slice(0, 4).join(" · ")}</p>
            )}
          </div>
        </section>

        <section id="analytics" className="section soft-bg">
          <div className="container analytics-grid">
            <div>
              <div className="section-heading">
                <h2>Application analytics</h2>
                <p>Track volume and conversion once applications are logged.</p>
              </div>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <h3>{kpis.applications}</h3>
                  <p>Applications sent</p>
                </div>
                <div className="kpi-card">
                  <h3>{kpis.responseRate}%</h3>
                  <p>Response rate</p>
                </div>
                <div className="kpi-card">
                  <h3>{kpis.interviewRate}%</h3>
                  <p>Interview rate</p>
                </div>
                <div className="kpi-card">
                  <h3>{kpis.offerRate}%</h3>
                  <p>Offer rate</p>
                </div>
              </div>
            </div>
            <div className="chart-card">
              <h3>Application results</h3>
              {applicationResults.length === 0 ? (
                <p>No applications sent yet.</p>
              ) : (
                <div className="result-list">
                  {applicationResults.slice(-5).map((result, index) => (
                    <div key={`${result.method}-${index}`} className="result-card">
                      <span className={`badge ${result.success ? "success" : "warning"}`}>
                        {result.success ? "Sent" : "Needs action"}
                      </span>
                      <p>{result.message || result.method}</p>
                      {result.mailtoLink && (
                        <a href={result.mailtoLink}>Open mailto link</a>
                      )}
                      {result.applyUrl && (
                        <a href={result.applyUrl} target="_blank" rel="noreferrer">
                          Open application link
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="schema" className="section">
          <div className="container">
            <div className="section-heading">
              <h2>Data schema snapshot</h2>
              <p>Structured storage for jobs, companies, and application history.</p>
            </div>
            <div className="schema-grid">
              <div className="schema-card">
                <h3>Jobs</h3>
                <pre>
                  {
                    "{id, title, company, source, description, requirements, salary_range, location, posted_date, urgency_score, applied, response}"
                  }
                </pre>
              </div>
              <div className="schema-card">
                <h3>Companies</h3>
                <pre>
                  {
                    "{id, name, website, funding_stage, funding_amount, funding_date, employee_count, growth_rate, tech_stack}"
                  }
                </pre>
              </div>
              <div className="schema-card">
                <h3>Applications</h3>
                <pre>
                  {
                    "{id, job_id, resume_variant, cover_letter_variant, sent_date, channel, response_status, interview_stage}"
                  }
                </pre>
              </div>
              <div className="schema-card">
                <h3>ResumeVariants</h3>
                <pre>
                  {
                    "{id, target_role, target_industry, emphasis_skills, modified_experiences, language, format}"
                  }
                </pre>
              </div>
              <div className="schema-card">
                <h3>Contacts</h3>
                <pre>
                  {
                    "{id, name, title, company, email, linkedin, twitter, connection_type, shared_interests}"
                  }
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-row">
          <p>Autonomous Job Hunter &copy; 2026</p>
          <div className="footer-links">
            <a href="#overview">Overview</a>
            <a href="#analytics">Analytics</a>
            <a href="#schema">Data</a>
          </div>
        </div>
      </footer>
    </>
  );
}
