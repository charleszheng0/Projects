import React, { useState } from 'react';

const Waitlist = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate submission
        setTimeout(() => setSubmitted(true), 500);
    };

    const containerStyle = {
        padding: '4rem 1rem',
        textAlign: 'center',
        backgroundColor: '#F5F1E8'
    };

    const inputStyle = {
        padding: '1rem',
        borderRadius: '4px',
        border: '1px solid #ccc',
        marginRight: '1rem',
        minWidth: '300px',
        fontSize: '1rem',
        background: '#fff'
    };

    const buttonStyle = {
        padding: '1rem 2rem',
        backgroundColor: '#2E2E2E',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        fontSize: '1rem',
        cursor: 'pointer'
    };

    return (
        <section id="waitlist" style={containerStyle}>
            <div className="container" style={{ maxWidth: '600px' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1rem' }}>
                    Join the Waitlist
                </h2>
                <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
                    Be the first to experience connection without illusion.
                </p>

                {submitted ? (
                    <div style={{ padding: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px' }}>
                        You're on the list. Welcome to The Immunity Date.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                        {/* Flex column for mobile, row for desktop via CSS media query if needed, keeping simple here */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', width: '100%' }}>
                            <input
                                type="email"
                                placeholder="Your email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={inputStyle}
                            />
                            <button type="submit" style={buttonStyle}>
                                Request Access
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
};

export default Waitlist;
