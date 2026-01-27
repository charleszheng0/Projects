import React, { useState } from 'react';

export default function JobInputStep({ onNext, onBack }) {
    const [jobDescription, setJobDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!jobDescription.trim()) return;

        setIsLoading(true);
        try {
            await onNext(jobDescription);
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="step-container fade-in">
            <h2>Target Job Description</h2>
            <p className="subtitle">Paste the full job description below for optimization</p>

            <div className="input-group">
                <textarea
                    className="job-textarea"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste job description here... (Include Title, Responsibilities, Requirements)"
                    rows={12}
                />
            </div>

            <div className="button-group">
                <button
                    className="secondary-button"
                    onClick={onBack}
                    disabled={isLoading}
                >
                    Back
                </button>
                <button
                    className="primary-button"
                    onClick={handleSubmit}
                    disabled={!jobDescription.trim() || isLoading}
                >
                    {isLoading ? 'Analyzing...' : 'Analyze & Optimize'}
                </button>
            </div>

            {/* Optional: URL Input could go here if implemented */}
            <div className="tip-box">
                <small>💡 Tip: Include the "Qualifications" and "Responsibilities" sections for best results.</small>
            </div>
        </div>
    );
}
