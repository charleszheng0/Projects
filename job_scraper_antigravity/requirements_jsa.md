AUTONOMOUS JOB HUNTER WEB APPLICATION
For Antigravity IDE / Web-Based Implementation
Create a fully functional web application that autonomously discovers and applies to job opportunities using web search, intelligent parsing, and dynamic resume adaptation.

APPLICATION OVERVIEW
Build a single-page web application (React artifact) that:

Takes user profile input (resume, skills, preferences)
Automatically searches the web for job opportunities
Analyzes and scores opportunities in real-time
Generates customized application materials
Displays results in an interactive dashboard
Tracks applications and performance metrics


CORE FEATURES & IMPLEMENTATION
1. USER PROFILE INPUT INTERFACE
Create a multi-step form to collect:
Personal Information:

Name, email, phone, location
LinkedIn profile, GitHub profile, portfolio URL
Target job titles (e.g., "Software Engineer", "Product Manager")
Target industries (e.g., "FinTech", "AI/ML", "Climate Tech")
Salary expectations (min-max range)
Work preferences (remote/hybrid/onsite, full-time/contract)

Master Experience Database:
javascript{
  experiences: [
    {
      id: "exp_1",
      title: "Software Engineer",
      alternativeTitles: ["Full-Stack Developer", "Backend Engineer", "Systems Engineer"],
      company: "TechCorp",
      startDate: "2022-01",
      endDate: "2024-12",
      description: "Base description of role...",
      achievements: [
        { text: "Reduced API latency by 60%", keywords: ["performance", "optimization", "backend"] },
        { text: "Led team of 4 engineers", keywords: ["leadership", "management", "team"] },
        { text: "Built microservices architecture", keywords: ["architecture", "microservices", "cloud"] }
      ],
      skills: ["Python", "JavaScript", "AWS", "Docker", "PostgreSQL"],
      flexibleMetrics: {
        teamSize: { min: 3, max: 5, actual: 4 },
        impactMetric: "60% latency reduction"
      }
    }
  ],
  
  skills: {
    technical: ["Python", "React", "AWS", "Docker", "PostgreSQL", "Machine Learning"],
    soft: ["Leadership", "Communication", "Problem Solving", "Agile"],
    languages: ["English (Native)", "Spanish (Professional)", "French (Conversational)"]
  },
  
  education: [
    { degree: "BS Computer Science", school: "University Name", year: 2020 }
  ],
  
  projects: [
    {
      name: "Open Source Contribution",
      description: "Contributed to React core...",
      url: "github.com/user/project",
      keywords: ["open-source", "React", "JavaScript"]
    }
  ]
}
Search Preferences:

Keywords to include/exclude
Company size preferences (startup, scale-up, enterprise)
Funding stage preferences (Seed, Series A-D, Public)
Geographic preferences
Application frequency (aggressive: 50+/day, moderate: 20-30/day, conservative: 10-15/day)


2. INTELLIGENT WEB SEARCH ENGINE
Multi-Source Search Strategy:
Use the web_search tool to query multiple sources simultaneously:
javascript// Search patterns to implement
const searchQueries = [
  // Traditional job boards
  `${targetRole} jobs ${targetLocation} site:linkedin.com`,
  `${targetRole} remote site:indeed.com`,
  `${targetRole} startup site:angel.co`,
  `${targetRole} site:ycombinator.com/jobs`,
  
  // Funding announcements (trigger opportunities)
  `"series A" OR "series B" funding ${industry} ${currentMonth} ${currentYear}`,
  `"just raised" OR "closes funding round" ${industry} site:techcrunch.com`,
  `"announces funding" ${targetCompanyStage} ${currentWeek}`,
  
  // GitHub trending (pre-job opportunities)
  `site:github.com/trending ${targetTechStack}`,
  `github repo ${targetTechStack} created:>${lastWeek}`,
  
  // Product Hunt launches
  `site:producthunt.com launched ${targetCategory} ${currentWeek}`,
  
  // Twitter/X building in public
  `"just launched" OR "shipped v1" OR "looking to hire" ${industry} site:twitter.com`,
  `"we're hiring" OR "join our team" ${targetRole} ${currentWeek}`,
  
  // HackerNews
  `"who is hiring" site:news.ycombinator.com ${currentMonth}`,
  
  // Company-specific
  `${companyName} careers ${targetRole}`,
  `${companyName} "recently hired" site:linkedin.com`
];
Implement Search Orchestrator:

Execute 5-10 searches in parallel using web_search tool
Parse results for job postings, company info, contact details
Extract: job title, company, description, requirements, posted date, application URL
Store results in application state

Real-Time Funding Monitor:
javascript// Search for recent funding announcements
const fundingSearches = [
  `"raises $" OR "secures funding" ${industry} ${currentDate}`,
  `"announces funding" OR "closes round" site:crunchbase.com`,
  `series A funding ${targetIndustry} ${currentMonth}`
];

// When funding found, immediately:
// 1. Extract company name and amount
// 2. Search for company website + careers page
// 3. Priority flag: "Apply within 48 hours of funding"
GitHub/Product Hunt Scanner:
javascript// Find emerging opportunities
const emergingSearches = [
  `github trending ${techStack} stars:>100`,
  `producthunt top launches ${currentWeek}`,
  `"YC S24" OR "YC W24" companies hiring`
];

// Extract founder info, tech stack, growth signals

3. OPPORTUNITY ANALYSIS & SCORING ENGINE
Implement Intelligent Scoring Algorithm:
javascriptfunction scoreOpportunity(job, company, userProfile) {
  let score = 0;
  
  // Base compatibility (0-40 points)
  const skillMatch = calculateSkillMatch(job.requirements, userProfile.skills);
  score += skillMatch * 0.4;
  
  // Urgency multipliers (0-30 points)
  if (company.fundingDate && daysSince(company.fundingDate) < 30) {
    score += 30; // Just raised funding
  }
  if (job.postedDate && daysSince(job.postedDate) < 3) {
    score += 20; // Freshly posted
  }
  if (company.isGitHubTrending || company.isProductHuntTop10) {
    score += 25; // High momentum
  }
  
  // Salary alignment (0-20 points)
  const salaryScore = calculateSalaryFit(job.salary, userProfile.salaryExpectations);
  score += salaryScore;
  
  // Location/remote preference (0-10 points)
  if (job.isRemote && userProfile.prefersRemote) {
    score += 10;
  }
  
  // Competition level (penalty)
  if (job.applicantCount > 200) {
    score *= 0.7; // High competition
  }
  
  return Math.min(score, 100);
}
Pattern Detection Engine:
javascriptfunction detectCompanyPatterns(company) {
  const patterns = {
    reverseJobOpportunity: false,
    hiringSpree: false,
    highTurnover: false,
    scalingFast: false,
    gapOpportunity: null
  };
  
  // Search for recent hires on LinkedIn
  const recentHires = searchWeb(`${company.name} "started new position" site:linkedin.com`);
  
  // Analyze hiring patterns
  if (recentHires.length > 5 in last 30 days) {
    patterns.hiringSpree = true;
  }
  
  // Identify gaps (e.g., hired 5 engineers but no DevOps)
  const roleTypes = categorizeRoles(recentHires);
  const missingRoles = identifyGaps(roleTypes, userProfile.targetRole);
  
  if (missingRoles.length > 0) {
    patterns.reverseJobOpportunity = true;
    patterns.gapOpportunity = missingRoles[0];
  }
  
  return patterns;
}

4. DYNAMIC RESUME GENERATOR
Adaptive Resume System:
javascriptfunction generateTargetedResume(userProfile, jobPosting) {
  // Extract key requirements from job
  const jobKeywords = extractKeywords(jobPosting.description);
  const requiredSkills = parseRequiredSkills(jobPosting.requirements);
  
  // Select and reframe relevant experiences
  const selectedExperiences = userProfile.experiences
    .map(exp => adaptExperience(exp, jobKeywords, requiredSkills))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3); // Top 3 most relevant
  
  // Adapt job titles if beneficial
  selectedExperiences.forEach(exp => {
    const betterTitle = findBestTitleVariant(exp, jobPosting.title);
    if (betterTitle) exp.displayTitle = betterTitle;
  });
  
  // Reorder skills to match job priority
  const prioritizedSkills = reorderSkillsByRelevance(
    userProfile.skills,
    requiredSkills
  );
  
  // Generate company-specific summary
  const summary = generatePersonalizedSummary(
    userProfile,
    jobPosting,
    jobPosting.company
  );
  
  return {
    summary,
    experiences: selectedExperiences,
    skills: prioritizedSkills,
    format: determineResumeFormat(jobPosting.company.type), // startup vs corporate
    tone: determineTone(jobPosting.company.type) // casual vs formal
  };
}

function adaptExperience(experience, targetKeywords, requiredSkills) {
  // Calculate relevance score
  const relevanceScore = calculateRelevance(experience, targetKeywords);
  
  // Select most relevant achievements
  const relevantAchievements = experience.achievements
    .filter(ach => hasKeywordOverlap(ach.keywords, targetKeywords))
    .slice(0, 3);
  
  // Reframe description to emphasize relevant aspects
  const adaptedDescription = emphasizeRelevantAspects(
    experience.description,
    targetKeywords
  );
  
  return {
    ...experience,
    description: adaptedDescription,
    achievements: relevantAchievements,
    relevanceScore
  };
}
Cover Letter Generator:
javascriptasync function generateCoverLetter(userProfile, job, company, patterns) {
  let template = "";
  
  if (patterns.reverseJobOpportunity) {
    // "Create this role" pitch
    template = `I noticed ${company.name} recently hired ${patterns.recentHires} but doesn't have a ${userProfile.targetRole}. Based on your growth trajectory, here's why this role would be valuable...`;
  } else if (company.fundingDate && daysSince(company.fundingDate) < 30) {
    // Funding trigger pitch
    template = `Congratulations on your recent ${company.fundingAmount} ${company.fundingRound}! I'm reaching out because I specialize in helping startups scale post-funding...`;
  } else if (company.isGitHubTrending) {
    // GitHub momentum pitch
    template = `I've been following ${company.name} on GitHub and I'm impressed by ${company.recentMilestone}. I'd love to contribute to...`;
  } else {
    // Standard pitch
    template = `I'm excited about the ${job.title} role at ${company.name}. Your work on ${company.mainProduct} aligns with my experience in...`;
  }
  
  // Use Claude API to polish and personalize
  const coverLetter = await callClaudeAPI({
    prompt: `Given this template and context, write a compelling cover letter: ${template}`,
    context: { userProfile, job, company }
  });
  
  return coverLetter;
}

5. COMPETITIVE INTELLIGENCE AUTO-APPLY
Competitor Discovery:
javascriptasync function findAndApplyToCompetitors(targetCompany, job, userProfile) {
  // Search for competitors
  const competitors = await searchWeb(
    `${targetCompany.name} competitors ${targetCompany.industry}`
  );
  
  // Parse competitor names
  const competitorList = extractCompanyNames(competitors);
  
  // For each competitor, search for similar roles
  const competitorOpportunities = [];
  
  for (const competitor of competitorList.slice(0, 5)) {
    const jobs = await searchWeb(
      `${competitor} careers ${job.title} OR ${job.category}`
    );
    
    if (jobs.length > 0) {
      // Generate comparison-based cover letter
      const coverLetter = `I'm exploring opportunities in ${targetCompany.industry}. While I've looked at ${targetCompany.name}, I'm particularly drawn to ${competitor}'s approach to ${specificDifferentiator}...`;
      
      competitorOpportunities.push({
        company: competitor,
        jobs: jobs,
        customPitch: coverLetter
      });
    }
  }
  
  return competitorOpportunities;
}

6. NETWORK LEVERAGE SYSTEM
LinkedIn Network Analysis (Simulated):
javascriptasync function findMutualConnections(targetCompany, userProfile) {
  // Search for potential connections
  const searchQuery = `${targetCompany.name} ${userProfile.university} OR ${userProfile.previousCompany} site:linkedin.com`;
  
  const results = await searchWeb(searchQuery);
  
  // Parse for potential mutual connections
  const potentialConnections = extractPeopleFromResults(results);
  
  // Generate warm intro template
  return potentialConnections.map(person => ({
    name: person.name,
    connection: person.mutualContext,
    introTemplate: `Hi ${person.name}, I noticed we both ${person.mutualContext}. I'm very interested in opportunities at ${targetCompany.name}...`
  }));
}

7. APPLICATION DASHBOARD UI
Create React Component with:
Search Status Display:

Real-time search progress ("Searching LinkedIn... Found 23 jobs")
Sources searched count
Jobs discovered count
Companies analyzed count

Opportunity Queue:
javascript// Display format
{
  highPriority: [
    {
      company: "StartupX",
      role: "Senior Engineer",
      score: 95,
      urgencyFlag: "Raised $10M 2 days ago",
      matchReason: "95% skill match, remote, $180k-220k",
      customResume: "Generated",
      customCoverLetter: "Generated",
      actions: ["Review", "Apply Now", "Skip"]
    }
  ],
  medium: [...],
  reverseOpportunities: [
    {
      company: "ScaleUp Inc",
      suggestion: "Create DevOps Engineer Role",
      reasoning: "Hired 5 backend engineers, no DevOps, scaling fast",
      pitch: "Generated",
      contactEmail: "founders@scaleup.com"
    }
  ]
}
Application Tracker:

Applied jobs with timestamp
Status tracking (sent, viewed, responded, interview, rejected)
Response rate metrics
Resume variant performance

Analytics Dashboard:
javascript{
  totalSearched: 500,
  totalApplied: 150,
  responseRate: 6.7%, // 10 responses
  interviewRate: 30%, // 3 interviews from 10 responses
  avgScoreApplied: 78,
  topPerformingVariant: "Tech Startup - Casual Tone",
  bestChannel: "Direct email to founders",
  bestTiming: "Tuesday 10am"
}

8. AUTOMATION & SCHEDULING
Continuous Search Loop:
javascriptfunction startAutomatedSearch(userProfile, settings) {
  const searchInterval = settings.aggressive ? 
    60 * 60 * 1000 : // Every hour
    4 * 60 * 60 * 1000; // Every 4 hours
  
  setInterval(async () => {
    // Run searches
    const opportunities = await runAllSearches(userProfile);
    
    // Score and sort
    const scored = opportunities
      .map(opp => ({
        ...opp,
        score: scoreOpportunity(opp, opp.company, userProfile)
      }))
      .sort((a, b) => b.score - a.score);
    
    // Auto-apply to top opportunities (if enabled)
    if (settings.autoApply) {
      const topOpps = scored.filter(opp => opp.score > settings.autoApplyThreshold);
      
      for (const opp of topOpps) {
        await generateAndStoreApplication(opp, userProfile);
      }
    }
    
    // Update dashboard
    updateDashboard(scored);
  }, searchInterval);
}
Daily Digest:

Summary email of new opportunities
Top 10 matches requiring review
Application performance stats
Action items


9. TECHNICAL IMPLEMENTATION DETAILS
State Management:
javascriptconst appState = {
  userProfile: { /* collected data */ },
  searchHistory: [],
  opportunities: [],
  applications: [],
  resumeVariants: {},
  coverLetters: {},
  analytics: {},
  settings: {
    autoApply: false,
    autoApplyThreshold: 80,
    searchFrequency: 'moderate',
    maxApplicationsPerDay: 30
  }
};
API Integration Pattern:
javascriptasync function searchAndAnalyze(query) {
  try {
    // Use web_search tool
    const results = await webSearch(query);
    
    // Parse results
    const parsed = parseSearchResults(results);
    
    // For promising opportunities, fetch full details
    const detailed = await Promise.all(
      parsed.slice(0, 5).map(async (item) => {
        if (item.url) {
          const fullContent = await webFetch(item.url);
          return { ...item, fullContent };
        }
        return item;
      })
    );
    
    return detailed;
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}
Claude API for Content Generation:
javascriptasync function generateWithClaude(prompt, context) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nContext: ${JSON.stringify(context)}`
        }
      ],
    })
  });
  
  const data = await response.json();
  return data.content[0].text;
}

10. UI/UX DESIGN REQUIREMENTS
Create a modern, dashboard-style interface with:
Header:

Logo/Title: "Autonomous Job Hunter"
User profile summary
Search status indicator
Settings button

Main Content Area (Tabs):

Discovery Tab:

Search configuration panel
"Start Search" / "Stop Search" button
Real-time search log
Discovered opportunities feed (infinite scroll)


Opportunities Tab:

Filter by score, urgency, company type
Card view of each opportunity:

Company logo & name
Role title
Match score (visual progress bar)
Key highlights (salary, remote, urgency flags)
"View Details" → expands to show:

Generated resume preview
Generated cover letter preview
Company analysis
Action buttons: "Apply", "Edit", "Skip"






Applied Tab:

List of all applications sent
Status tracking with timeline
Response rate stats
Interview scheduler


Analytics Tab:

Charts and graphs
Performance metrics
A/B test results
Optimization suggestions



Sidebar:

Quick stats (jobs found today, applications sent, responses)
Priority alerts (new funding announcements, trending repos)
Recent activity feed

Color Scheme:

Primary: Professional blue (#2563eb)
Success: Green (#10b981) for high-match scores
Warning: Orange (#f59e0b) for urgent opportunities
Background: Clean white/light gray

Responsive Design:

Mobile-friendly
Collapsible sidebar
Touch-optimized interactions


11. SAFETY & ETHICS
Built-in Guardrails:
javascriptfunction validateResumeModifications(original, modified) {
  // Ensure no fabrication
  const checks = {
    dateRangeOK: validateDateChanges(original.dates, modified.dates), // Max ±2 months
    titlesValid: original.alternativeTitles.includes(modified.title),
    achievementsReal: modified.achievements.every(a => 
      original.achievements.some(oa => similarity(a, oa) > 0.7)
    ),
    noDegreesFabricated: modified.education.every(e =>
      original.education.some(oe => e.degree === oe.degree)
    )
  };
  
  if (!Object.values(checks).every(v => v)) {
    throw new Error("Invalid resume modification detected");
  }
  
  return true;
}
Application Rate Limiting:

Max 100 applications per day
Stagger applications (1 per minute minimum)
Warning when approaching limits

User Review Mode:

Option to review all applications before sending
Approve/reject queue
Edit capability


12. EXPORT & INTEGRATION FEATURES
Export Capabilities:

Download all generated resumes (PDF/DOCX)
Export application tracker (CSV)
Download analytics report
Backup entire profile

Integration Hooks:

Email forwarding for responses
Calendar integration for interviews
Slack/Discord notifications for high-priority opportunities

IMPLEMENTATION CHECKLIST
Phase 1: Core Search Engine (Build First)

 User profile input form
 Web search integration with multiple query patterns
 Basic results parsing and storage
 Simple opportunity list display

Phase 2: Intelligence Layer

 Scoring algorithm implementation
 Pattern detection engine
 Funding/GitHub/Product Hunt monitors
 Competitive intelligence finder

Phase 3: Content Generation

 Resume variant generator
 Cover letter generator
 Claude API integration
 Preview and editing interface

Phase 4: Automation

 Continuous search loop
 Auto-apply logic
 Application tracking
 Email notifications

Phase 5: Analytics & Optimization

 Analytics dashboard
 A/B testing framework
 Performance metrics
 Optimization suggestions

Phase 6: Polish

 Responsive design
 Error handling
 Export features
 User documentation