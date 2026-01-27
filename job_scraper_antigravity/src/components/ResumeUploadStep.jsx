import React, { useState, useRef } from 'react';
import { parseResumeFile } from '../utils/resumeParser';

export default function ResumeUploadStep({ onNext }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const processFile = async (file) => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        try {
            // 1. Basic text extraction
            const rawText = await parseResumeFile(file);

            // 2. Deep parsing with Claude is done in the next step or here?
            // Requirements say "Parse with Claude" happens here.
            // But we might want to defer the expensive API call until we have the job description?
            // No, requirements say "Step 1: Upload... Step 2: Job Input".
            // Let's just pass the raw text and file name to the parent, 
            // and let the parent manage when to call the API (or call it now if we want early feedback).

            // For better UX, let's just pass the file and text up, 
            // and show a success state. The specific deep parsing might be better done 
            // in context or parallel to job analysis to save time/tokens if user drops off.
            // BUT, the requirements pseudo-code shows: 
            // `const parsed = await parseResumeWithClaude(text, file.name); setParsedResume(parsed); setStep(2);`
            // So checking intent... yes, parse immediately.

            // Let's pass raw info up to parent to handle the async call so we can show global loading?
            // Or handle it here. Parent is better for state management.

            await onNext({ file, rawText });

        } catch (err) {
            console.error('Upload Error:', err);
            setError(err.message || 'Failed to read file');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileChange = (e) => {
        processFile(e.target.files[0]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        processFile(e.dataTransfer.files[0]);
    };

    return (
        <div className="step-container fade-in">
            <h2>Upload Your Resume</h2>
            <p className="subtitle">We accept PDF, DOCX, and TXT formats</p>

            <div
                className={`upload-dropzone ${isProcessing ? 'processing' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.txt"
                    style={{ display: 'none' }}
                />

                {isProcessing ? (
                    <div className="processing-state">
                        <div className="spinner"></div>
                        <p>Reading file...</p>
                    </div>
                ) : (
                    <div className="empty-state">
                        <span className="icon">📄</span>
                        <h3>Click to upload or drag and drop</h3>
                        <p>PDF, DOCX, TXT (Max 10MB)</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="error-message">
                    ⚠️ {error}
                </div>
            )}

            <div className="divider">OR</div>

            <button
                className="secondary-button"
                onClick={() => {
                    const text = prompt("Paste your resume text here:");
                    if (text) onNext({ file: { name: 'Paste_Resume.txt' }, rawText: text });
                }}
                disabled={isProcessing}
            >
                Paste Text Directly
            </button>
        </div>
    );
}
