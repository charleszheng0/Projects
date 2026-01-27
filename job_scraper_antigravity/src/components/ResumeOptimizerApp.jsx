import React, { useState, useEffect } from 'react';
import ResumeUploadStep from './ResumeUploadStep';
import JobInputStep from './JobInputStep';
import ResultsStep from './ResultsStep';
import { parseResumeDeep, analyzeJobDescription, optimizeResumeForJob } from '../utils/claudeService';
import { calculateATSScore } from '../utils/atsScorer';
import '../ResumeOptimizer.css';

// Steps definition
const STEPS = {
    UPLOAD: 1,
    JOB_INPUT: 2,
    OPTIMIZING: 3,
    RESULTS: 4
};

export default function ResumeOptimizerApp() {
    const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD);

    // Data State
    const [resumeData, setResumeData] = useState(null); // { rawText, file, parsed (optional) }
    const [jobData, setJobData] = useState(null); // { text, analyzed }
    const [optimizedResume, setOptimizedResume] = useState(null);

    // Processing State
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');

    // Step 1: Handle Resume Upload
    const handleResumeUploaded = async (data) => {
        setResumeData(data);
        setCurrentStep(STEPS.JOB_INPUT);
    };

    // Step 2: Handle Job Input & Start Optimization
    const handleJobInput = async (jobText) => {
        setJobData({ text: jobText });
        setCurrentStep(STEPS.OPTIMIZING);

        // Start the heavy lifting
        processOptimization(resumeData.rawText, jobText);
    };

    // Main Processing Logic
    const processOptimization = async (resumeText, jobText) => {
        setIsProcessing(true);
        try {
            // 1. Parse Resume Deeply
            setProcessingStatus('Parsing resume with AI...');
            const parsedResume = await parseResumeDeep(resumeText, resumeData.file?.name);

            // 2. Analyze Job
            setProcessingStatus('Analyzing job requirements...');
            const analyzedJob = await analyzeJobDescription(jobText);
            setJobData(prev => ({ ...prev, analyzed: analyzedJob }));

            // 3. Optimize
            setProcessingStatus('Tailoring resume content...');
            const optimized = await optimizeResumeForJob(parsedResume, analyzedJob);

            // 4. Score
            setProcessingStatus('Calculating ATS score...');
            const score = calculateATSScore(optimized.optimizedResume, analyzedJob);
            optimized.optimizationReport.atsScore = score.score; // Inject score

            setOptimizedResume({ ...optimized, originalParsed: parsedResume });
            setCurrentStep(STEPS.RESULTS);

        } catch (error) {
            console.error('Optimization failed:', error);
            alert('Optimization failed: ' + error.message);
            setCurrentStep(STEPS.JOB_INPUT); // Go back
        } finally {
            setIsProcessing(false);
        }
    };

    // Navigation
    const handleStartOver = () => {
        if (window.confirm('Are you sure? All current progress will be lost.')) {
            setResumeData(null);
            setJobData(null);
            setOptimizedResume(null);
            setCurrentStep(STEPS.UPLOAD);
        }
    };

    return (
        <div className="optimizer-app">
            <header className="app-header">
                <h1>AI Resume Optimizer</h1>
                <div className="step-indicator">
                    <div className={`step-dot ${currentStep >= 1 ? 'active' : ''}`}>1. Upload</div>
                    <div className={`step-line ${currentStep >= 2 ? 'active' : ''}`}></div>
                    <div className={`step-dot ${currentStep >= 2 ? 'active' : ''}`}>2. Job</div>
                    <div className={`step-line ${currentStep >= 3 ? 'active' : ''}`}></div>
                    <div className={`step-dot ${currentStep >= 3 ? 'active' : ''}`}>3. Optimize</div>
                    <div className={`step-line ${currentStep >= 4 ? 'active' : ''}`}></div>
                    <div className={`step-dot ${currentStep >= 4 ? 'active' : ''}`}>4. Result</div>
                </div>
            </header>

            <main className="app-content">
                {currentStep === STEPS.UPLOAD && (
                    <ResumeUploadStep onNext={handleResumeUploaded} />
                )}

                {currentStep === STEPS.JOB_INPUT && (
                    <JobInputStep
                        onNext={handleJobInput}
                        onBack={() => setCurrentStep(STEPS.UPLOAD)}
                    />
                )}

                {currentStep === STEPS.OPTIMIZING && (
                    <div className="processing-view">
                        <div className="spinner-large"></div>
                        <h2>Optimizing Your Resume</h2>
                        <p className="status-text">{processingStatus}</p>
                        <ul className="checklist">
                            <li className={processingStatus !== 'Parsing resume with AI...' ? 'done' : 'active'}>
                                Parsing Resume Structure
                            </li>
                            <li className={jobData?.analyzed ? 'done' : (processingStatus === 'Analyzing job requirements...' ? 'active' : '')}>
                                Analyzing Job Description
                            </li>
                            <li className={optimizedResume ? 'done' : (processingStatus === 'Tailoring resume content...' ? 'active' : '')}>
                                Re-writing Content
                            </li>
                            <li className={optimizedResume?.optimizationReport?.atsScore ? 'done' : (processingStatus === 'Calculating ATS score...' ? 'active' : '')}>
                                Final Verification
                            </li>
                        </ul>
                    </div>
                )}

                {currentStep === STEPS.RESULTS && optimizedResume && (
                    <ResultsStep
                        original={optimizedResume.originalParsed}
                        optimized={optimizedResume}
                        jobAnalysis={jobData.analyzed}
                        onStartOver={handleStartOver}
                    />
                )}
            </main>
        </div>
    );
}
