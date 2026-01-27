import React from 'react';
import './Features.css';

const Features = () => {
    return (
        <section className="features container">
            <div className="feature-block">
                <div className="feature-text">
                    <span className="feature-meta">The Premise</span>
                    <h2 className="feature-title">Life Streams</h2>
                    <p className="feature-desc">
                        No photos. No filters. To “exist” here, you broadcast one hour of
                        unscripted daily life. Matches don’t swipe — they witness.
                    </p>
                </div>
                {/* Placeholder for visual/texture */}
                <div style={{ width: '100%', height: '300px', background: '#EAE5D9', borderRadius: '4px' }}></div>
            </div>

            <div className="feature-block">
                <div className="feature-text">
                    <span className="feature-meta">Flagship Mechanic</span>
                    <h2 className="feature-title">Shared Windows</h2>
                    <p className="feature-desc">
                        Replace matching with temporal overlap. A 48–72 hour real-life bridge
                        to observe daily rhythms. When the window ends, the connection closes
                        automatically unless both choose to reopen it.
                    </p>
                </div>
                {/* Placeholder for visual/texture */}
                <div style={{ width: '100%', height: '300px', background: '#EAE5D9', borderRadius: '4px' }}></div>
            </div>
        </section>
    );
};

export default Features;
