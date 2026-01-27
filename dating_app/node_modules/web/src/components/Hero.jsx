import React from 'react';
import './Hero.css';

const Hero = () => {
    return (
        <section className="hero text-center">
            <div className="hero-background"></div>
            <div className="hero-content">
                <h1 className="hero-tagline">
                    No filters. No chasing.<br />
                    Just real life, side by side.
                </h1>
                <p className="hero-sub">
                    The “Immunity” Date removes the performance from dating.
                    Connect through 24-hour Life Streams.
                </p>
                <a href="#waitlist" className="hero-cta">
                    Join the Movement
                </a>
            </div>
        </section>
    );
};

export default Hero;
