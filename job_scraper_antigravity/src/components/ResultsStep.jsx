import React, { useState } from 'react';
import { generateResumePDF } from '../utils/pdfGenerator';
import ResumeComparison from './ResumeComparison';

export default function ResultsStep({ original, optimized, jobAnalysis, onStartOver }) {
    const [activeTab, setActiveTab] = useState('preview'); // preview, debugging

    const handleDownloadPDF = () => {
        try {
            const blob = generateResumePDF(optimized);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${optimized.optimizedResume.personalInfo.name.replace(/\s+/g, '_')}_Optimized.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            alert('Error generating PDF: ' + error.message);
        }
    };

    const handleDownloadJSON = () => {
        const dataStr = JSON.stringify(optimized, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resume_data.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="step-container full-width fade-in">
            <div className="results-header">
                <div className="header-left">
                    <h2>Optimization Complete!</h2>
                    <p>Your resume has been tailored for <strong>{jobAnalysis.jobTitle}</strong> at <strong>{jobAnalysis.company}</strong></p>
                </div>
                <div className="header-actions">
                    <button className="secondary-button" onClick={onStartOver}>Start New Optimization</button>
                    <button className="primary-button" onClick={handleDownloadPDF}>Download PDF</button>
                </div>
            </div>

            <div className="results-content">
                <ResumeComparison original={original} optimized={optimized} />
            </div>

            <div className="download-options">
                <h3>More Options</h3>
                <div className="button-group">
                    <button className="tertiary-button" onClick={handleDownloadJSON}>Download JSON Data</button>
                    <button className="tertiary-button" onClick={() => window.print()}>Print / Save as PDF (Browser)</button>
                </div>
            </div>
        </div>
    );
}
