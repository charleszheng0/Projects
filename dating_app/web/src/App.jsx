import React from 'react';
import Hero from './components/Hero';
import Features from './components/Features';
import Philosophy from './components/Philosophy';
import Waitlist from './components/Waitlist';

// Note: Global styles are in index.css

function App() {
  return (
    <div className="app">
      <Hero />
      <Philosophy />
      <Features />
      <Waitlist />

      <footer style={{ padding: '2rem', textAlign: 'center', fontSize: '0.8rem', opacity: 0.6 }}>
        &copy; {new Date().getFullYear()} The Immunity Date. All rights reserved.
      </footer>
    </div>
  );
}

export default App;
