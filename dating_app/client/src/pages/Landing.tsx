import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
    return (
        <div className="flex flex-col min-h-screen bg-cinematic-beige text-deep-charcoal">
            <header className="p-6 flex justify-between items-center max-w-6xl mx-auto w-full">
                <h1 className="text-2xl font-serif font-bold tracking-tight">The Immunity Date</h1>
                <div className="space-x-4">
                    <Link to="/login" className="px-4 py-2 hover:opacity-70">Login</Link>
                    <Link to="/signup" className="px-5 py-2 bg-deep-charcoal text-white rounded-full hover:bg-opacity-90 transition">
                        Join
                    </Link>
                </div>
            </header>

            <main className="flex-grow flex flex-col justify-center items-center text-center p-6 bg-[url('https://www.transparenttextures.com/patterns/dust.png')]">
                <div className="max-w-2xl animate-fade-in-up">
                    <h2 className="text-5xl md:text-7xl font-serif mb-6 leading-tight">
                        No filters.<br />No chasing.
                    </h2>
                    <p className="text-xl md:text-2xl mb-12 font-light opacity-80 max-w-xl mx-auto">
                        A radical transparency dating app.
                        Broadcast 1 hour of unscripted life to exist here.
                        Matches don't swipe — they witness.
                    </p>
                    <Link to="/signup" className="px-8 py-4 bg-deep-charcoal text-cinematic-beige text-lg rounded-full font-medium hover:scale-105 transition-transform duration-300">
                        Start Your Life Stream
                    </Link>
                </div>

                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl text-left opacity-90">
                    <div>
                        <h3 className="font-serif text-2xl mb-2">Life Streams</h3>
                        <p>You are only visible when you share 1 hour of real life daily. No curated profiles.</p>
                    </div>
                    <div>
                        <h3 className="font-serif text-2xl mb-2">Shared Windows</h3>
                        <p>Connect for 48 hours. Watch daily rhythms. Then the window closes automatically.</p>
                    </div>
                    <div>
                        <h3 className="font-serif text-2xl mb-2">No Ghosting</h3>
                        <p>Endings are built-in. If you don't both say "Yes" to renew, it simply ends.</p>
                    </div>
                </div>
            </main>

            <footer className="p-6 text-center opacity-50 text-sm">
                &copy; {new Date().getFullYear()} The Immunity Date. Radical Transparency.
            </footer>
        </div>
    );
};

export default Landing;
