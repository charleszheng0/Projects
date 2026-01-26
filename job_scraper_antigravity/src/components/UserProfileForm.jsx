import { useState } from 'react'

/**
 * Multi-step user profile form
 */
function UserProfileForm({ profile, onSave }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Personal info
        name: profile?.name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        location: profile?.location || '',
        linkedIn: profile?.linkedIn || '',
        github: profile?.github || '',
        portfolio: profile?.portfolio || '',

        // Career preferences
        targetRoles: profile?.targetRoles || ['Software Engineer'],
        targetIndustries: profile?.targetIndustries || ['AI/ML', 'FinTech'],
        salaryMin: profile?.salaryExpectations?.min || 150000,
        salaryMax: profile?.salaryExpectations?.max || 200000,
        workPreference: profile?.workPreference || 'remote',
        employmentType: profile?.employmentType || 'full-time',

        // Skills
        technicalSkills: profile?.skills?.technical?.join(', ') || '',
        softSkills: profile?.skills?.soft?.join(', ') || '',
        languages: profile?.skills?.languages?.join(', ') || '',

        // Experience (simplified for demo)
        currentTitle: '',
        currentCompany: '',
        yearsExperience: 5,
        achievements: '',

        // Education
        degree: '',
        school: '',
        gradYear: 2020,

        // Search preferences
        applicationFrequency: 'moderate',
        companySize: ['startup', 'scale-up'],
        keywords: '',
        excludeKeywords: ''
    });

    const [errors, setErrors] = useState({});
    const [tagInput, setTagInput] = useState({ roles: '', industries: '' });

    const steps = [
        { number: 1, label: 'Personal Info' },
        { number: 2, label: 'Career Goals' },
        { number: 3, label: 'Experience' },
        { number: 4, label: 'Preferences' }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleAddTag = (field, value) => {
        if (!value.trim()) return;

        setFormData(prev => ({
            ...prev,
            [field]: [...(prev[field] || []), value.trim()]
        }));
        setTagInput(prev => ({ ...prev, [field === 'targetRoles' ? 'roles' : 'industries']: '' }));
    };

    const handleRemoveTag = (field, index) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const handleTagKeyDown = (e, field) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const inputField = field === 'targetRoles' ? 'roles' : 'industries';
            handleAddTag(field, tagInput[inputField]);
        }
    };

    const validateStep = (stepNum) => {
        const newErrors = {};

        if (stepNum === 1) {
            if (!formData.name.trim()) newErrors.name = 'Name is required';
            if (!formData.email.trim()) newErrors.email = 'Email is required';
            else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        }

        if (stepNum === 2) {
            if (formData.targetRoles.length === 0) newErrors.targetRoles = 'Add at least one target role';
            if (formData.salaryMin >= formData.salaryMax) newErrors.salary = 'Min salary must be less than max';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(prev => Math.min(prev + 1, 4));
        }
    };

    const handleBack = () => {
        setStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = () => {
        if (!validateStep(step)) return;

        // Convert form data to profile format
        const profileData = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            location: formData.location,
            linkedIn: formData.linkedIn,
            github: formData.github,
            portfolio: formData.portfolio,
            targetRoles: formData.targetRoles,
            targetIndustries: formData.targetIndustries,
            salaryExpectations: {
                min: parseInt(formData.salaryMin),
                max: parseInt(formData.salaryMax)
            },
            workPreference: formData.workPreference,
            employmentType: formData.employmentType,
            skills: {
                technical: formData.technicalSkills.split(',').map(s => s.trim()).filter(Boolean),
                soft: formData.softSkills.split(',').map(s => s.trim()).filter(Boolean),
                languages: formData.languages.split(',').map(s => s.trim()).filter(Boolean)
            },
            experiences: formData.currentTitle ? [{
                id: 'exp_default',
                title: formData.currentTitle,
                alternativeTitles: [],
                company: formData.currentCompany,
                startDate: `${new Date().getFullYear() - formData.yearsExperience}-01`,
                endDate: 'present',
                description: 'Current role',
                achievements: formData.achievements.split('\n').filter(Boolean).map((text, i) => ({
                    text,
                    keywords: []
                })),
                skills: formData.technicalSkills.split(',').map(s => s.trim()).filter(Boolean)
            }] : [],
            education: formData.degree ? [{
                degree: formData.degree,
                school: formData.school,
                year: parseInt(formData.gradYear)
            }] : [],
            projects: [],
            searchPreferences: {
                keywords: formData.keywords.split(',').map(s => s.trim()).filter(Boolean),
                excludeKeywords: formData.excludeKeywords.split(',').map(s => s.trim()).filter(Boolean),
                companySize: formData.companySize,
                applicationFrequency: formData.applicationFrequency
            }
        };

        onSave(profileData);
    };

    const handleCheckboxChange = (value) => {
        setFormData(prev => ({
            ...prev,
            companySize: prev.companySize.includes(value)
                ? prev.companySize.filter(v => v !== value)
                : [...prev.companySize, value]
        }));
    };

    return (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card-header">
                <h2 className="card-title">Set Up Your Profile</h2>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                    Step {step} of 4
                </span>
            </div>

            <div className="card-body">
                {/* Progress Steps */}
                <div className="form-progress">
                    {steps.map((s, index) => (
                        <div
                            key={s.number}
                            className={`form-step ${step === s.number ? 'active' : ''} ${step > s.number ? 'completed' : ''}`}
                        >
                            <div className="form-step-number">
                                {step > s.number ? '✓' : s.number}
                            </div>
                            <div className="form-step-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Step 1: Personal Info */}
                {step === 1 && (
                    <div className="form-section">
                        <h3 className="form-section-title">
                            <span className="form-section-icon">👤</span>
                            Personal Information
                        </h3>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">
                                    Full Name <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="John Doe"
                                />
                                {errors.name && <span className="form-error">{errors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Email <span className="required">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="john@example.com"
                                />
                                {errors.email && <span className="form-error">{errors.email}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    className="form-input"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <input
                                    type="text"
                                    name="location"
                                    className="form-input"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    placeholder="San Francisco, CA"
                                />
                            </div>
                        </div>

                        <h4 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1rem' }}>
                            🔗 Professional Links
                        </h4>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">LinkedIn Profile</label>
                                <input
                                    type="url"
                                    name="linkedIn"
                                    className="form-input"
                                    value={formData.linkedIn}
                                    onChange={handleInputChange}
                                    placeholder="https://linkedin.com/in/johndoe"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">GitHub Profile</label>
                                <input
                                    type="url"
                                    name="github"
                                    className="form-input"
                                    value={formData.github}
                                    onChange={handleInputChange}
                                    placeholder="https://github.com/johndoe"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Portfolio Website</label>
                                <input
                                    type="url"
                                    name="portfolio"
                                    className="form-input"
                                    value={formData.portfolio}
                                    onChange={handleInputChange}
                                    placeholder="https://johndoe.dev"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Career Goals */}
                {step === 2 && (
                    <div className="form-section">
                        <h3 className="form-section-title">
                            <span className="form-section-icon">🎯</span>
                            Career Goals & Preferences
                        </h3>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">
                                Target Job Titles <span className="required">*</span>
                            </label>
                            <div className="tags-input-container">
                                {formData.targetRoles.map((role, index) => (
                                    <span key={index} className="tag">
                                        {role}
                                        <button
                                            className="tag-remove"
                                            onClick={() => handleRemoveTag('targetRoles', index)}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    className="tags-input"
                                    value={tagInput.roles}
                                    onChange={(e) => setTagInput(prev => ({ ...prev, roles: e.target.value }))}
                                    onKeyDown={(e) => handleTagKeyDown(e, 'targetRoles')}
                                    placeholder="Type and press Enter..."
                                />
                            </div>
                            {errors.targetRoles && <span className="form-error">{errors.targetRoles}</span>}
                            <span className="form-help">e.g., Software Engineer, Product Manager, Data Scientist</span>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">Target Industries</label>
                            <div className="tags-input-container">
                                {formData.targetIndustries.map((industry, index) => (
                                    <span key={index} className="tag">
                                        {industry}
                                        <button
                                            className="tag-remove"
                                            onClick={() => handleRemoveTag('targetIndustries', index)}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    className="tags-input"
                                    value={tagInput.industries}
                                    onChange={(e) => setTagInput(prev => ({ ...prev, industries: e.target.value }))}
                                    onKeyDown={(e) => handleTagKeyDown(e, 'targetIndustries')}
                                    placeholder="Type and press Enter..."
                                />
                            </div>
                            <span className="form-help">e.g., FinTech, AI/ML, Climate Tech, Healthcare</span>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Minimum Salary ($)</label>
                                <input
                                    type="number"
                                    name="salaryMin"
                                    className="form-input"
                                    value={formData.salaryMin}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="5000"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Maximum Salary ($)</label>
                                <input
                                    type="number"
                                    name="salaryMax"
                                    className="form-input"
                                    value={formData.salaryMax}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="5000"
                                />
                                {errors.salary && <span className="form-error">{errors.salary}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Work Preference</label>
                                <select
                                    name="workPreference"
                                    className="form-select"
                                    value={formData.workPreference}
                                    onChange={handleInputChange}
                                >
                                    <option value="remote">Remote</option>
                                    <option value="hybrid">Hybrid</option>
                                    <option value="onsite">On-site</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Employment Type</label>
                                <select
                                    name="employmentType"
                                    className="form-select"
                                    value={formData.employmentType}
                                    onChange={handleInputChange}
                                >
                                    <option value="full-time">Full-time</option>
                                    <option value="contract">Contract</option>
                                    <option value="part-time">Part-time</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Experience & Skills */}
                {step === 3 && (
                    <div className="form-section">
                        <h3 className="form-section-title">
                            <span className="form-section-icon">💼</span>
                            Experience & Skills
                        </h3>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Current/Recent Job Title</label>
                                <input
                                    type="text"
                                    name="currentTitle"
                                    className="form-input"
                                    value={formData.currentTitle}
                                    onChange={handleInputChange}
                                    placeholder="Senior Software Engineer"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Company</label>
                                <input
                                    type="text"
                                    name="currentCompany"
                                    className="form-input"
                                    value={formData.currentCompany}
                                    onChange={handleInputChange}
                                    placeholder="Tech Company Inc."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Years of Experience</label>
                                <input
                                    type="number"
                                    name="yearsExperience"
                                    className="form-input"
                                    value={formData.yearsExperience}
                                    onChange={handleInputChange}
                                    min="0"
                                    max="50"
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                            <label className="form-label">Key Achievements</label>
                            <textarea
                                name="achievements"
                                className="form-textarea"
                                value={formData.achievements}
                                onChange={handleInputChange}
                                placeholder="• Reduced API latency by 60%&#10;• Led team of 4 engineers&#10;• Built microservices architecture"
                                rows={4}
                            />
                            <span className="form-help">Enter one achievement per line, with metrics when possible</span>
                        </div>

                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                            <label className="form-label">Technical Skills</label>
                            <textarea
                                name="technicalSkills"
                                className="form-textarea"
                                value={formData.technicalSkills}
                                onChange={handleInputChange}
                                placeholder="Python, JavaScript, React, AWS, Docker, PostgreSQL"
                                rows={2}
                            />
                            <span className="form-help">Comma-separated list of technical skills</span>
                        </div>

                        <div className="form-grid" style={{ marginTop: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Soft Skills</label>
                                <input
                                    type="text"
                                    name="softSkills"
                                    className="form-input"
                                    value={formData.softSkills}
                                    onChange={handleInputChange}
                                    placeholder="Leadership, Communication, Problem Solving"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Languages</label>
                                <input
                                    type="text"
                                    name="languages"
                                    className="form-input"
                                    value={formData.languages}
                                    onChange={handleInputChange}
                                    placeholder="English (Native), Spanish (Professional)"
                                />
                            </div>
                        </div>

                        <h4 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1rem' }}>
                            🎓 Education
                        </h4>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Degree</label>
                                <input
                                    type="text"
                                    name="degree"
                                    className="form-input"
                                    value={formData.degree}
                                    onChange={handleInputChange}
                                    placeholder="BS Computer Science"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">School/University</label>
                                <input
                                    type="text"
                                    name="school"
                                    className="form-input"
                                    value={formData.school}
                                    onChange={handleInputChange}
                                    placeholder="Stanford University"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Graduation Year</label>
                                <input
                                    type="number"
                                    name="gradYear"
                                    className="form-input"
                                    value={formData.gradYear}
                                    onChange={handleInputChange}
                                    min="1970"
                                    max="2030"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Search Preferences */}
                {step === 4 && (
                    <div className="form-section">
                        <h3 className="form-section-title">
                            <span className="form-section-icon">⚙️</span>
                            Search Preferences
                        </h3>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">Application Frequency</label>
                            <select
                                name="applicationFrequency"
                                className="form-select"
                                value={formData.applicationFrequency}
                                onChange={handleInputChange}
                            >
                                <option value="aggressive">Aggressive (50+ per day)</option>
                                <option value="moderate">Moderate (20-30 per day)</option>
                                <option value="conservative">Conservative (10-15 per day)</option>
                            </select>
                            <span className="form-help">How aggressively should we search for opportunities?</span>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">Company Size Preferences</label>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                {['startup', 'scale-up', 'enterprise', 'agency'].map(size => (
                                    <label
                                        key={size}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.companySize.includes(size)}
                                            onChange={() => handleCheckboxChange(size)}
                                        />
                                        <span style={{ textTransform: 'capitalize' }}>{size}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">Include Keywords</label>
                            <input
                                type="text"
                                name="keywords"
                                className="form-input"
                                value={formData.keywords}
                                onChange={handleInputChange}
                                placeholder="remote, flexible, equity"
                            />
                            <span className="form-help">Comma-separated keywords to prioritize in job listings</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Exclude Keywords</label>
                            <input
                                type="text"
                                name="excludeKeywords"
                                className="form-input"
                                value={formData.excludeKeywords}
                                onChange={handleInputChange}
                                placeholder="senior manager, director, VP"
                            />
                            <span className="form-help">Comma-separated keywords to avoid in job listings</span>
                        </div>

                        <div
                            className="preview-section"
                            style={{ marginTop: '2rem' }}
                        >
                            <div className="preview-title">
                                ✨ Profile Summary
                            </div>
                            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
                                <p><strong>Name:</strong> {formData.name || 'Not provided'}</p>
                                <p><strong>Target Roles:</strong> {formData.targetRoles.join(', ') || 'Not specified'}</p>
                                <p><strong>Industries:</strong> {formData.targetIndustries.join(', ') || 'Not specified'}</p>
                                <p><strong>Salary Range:</strong> ${formData.salaryMin.toLocaleString()} - ${formData.salaryMax.toLocaleString()}</p>
                                <p><strong>Work Preference:</strong> {formData.workPreference}</p>
                                <p><strong>Skills:</strong> {formData.technicalSkills || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="card-footer">
                <div className="btn-group" style={{ justifyContent: 'space-between', width: '100%' }}>
                    {step > 1 ? (
                        <button className="btn btn-secondary" onClick={handleBack}>
                            ← Back
                        </button>
                    ) : (
                        <div></div>
                    )}

                    {step < 4 ? (
                        <button className="btn btn-primary" onClick={handleNext}>
                            Next →
                        </button>
                    ) : (
                        <button className="btn btn-success btn-lg" onClick={handleSubmit}>
                            🚀 Start Hunting!
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UserProfileForm
