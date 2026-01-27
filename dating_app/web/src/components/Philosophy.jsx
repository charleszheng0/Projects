import React from 'react';

const Philosophy = () => {
    // Inline styles for this specific text-heavy section
    const sectionStyle = {
        padding: '6rem 1rem',
        backgroundColor: '#fff', // Slightly brighter surface
        color: '#2E2E2E',
        textAlign: 'center'
    };

    const quoteStyle = {
        fontFamily: 'Playfair Display, serif',
        fontSize: '2rem',
        maxWidth: '800px',
        margin: '0 auto 2rem auto',
        fontStyle: 'italic',
        lineHeight: '1.4'
    };

    const textStyle = {
        fontSize: '1.1rem',
        maxWidth: '600px',
        margin: '0 auto',
        opacity: 0.8
    };

    return (
        <section style={sectionStyle}>
            <div className="container">
                <blockquote style={quoteStyle}>
                    "Radical transparency isn’t scary — it’s relief."
                </blockquote>
                <p style={textStyle}>
                    End the performance era. Compatibility isn’t a photo; it’s a rhythm.
                    Automatic closure is the new honesty.
                    <br /><br />
                    <strong>Live, not perform.</strong>
                </p>
            </div>
        </section>
    );
};

export default Philosophy;
