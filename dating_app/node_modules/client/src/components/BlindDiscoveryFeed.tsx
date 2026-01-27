import React, { useState, useEffect } from 'react';
import ReputationDisplay from './ReputationDisplay';

// Mock currentUser
const currentUser = {
    userId: 'me',
    compatibilityVector: []
};

// Mock API
const findCompatibleMatches = async (vector: any) => {
    return [{
        userId: "user_123",
        name: "Sarah",
        age: 28,
        location: "San Francisco, CA",
        compatibilityScore: 94,
        about: "I'm passionate about sustainable design and spend weekends hiking...",
        interests: ["hiking", "pottery", "sci-fi books", "cooking"],
        values: ["authenticity", "growth", "adventure"],
        lookingFor: "Someone curious, kind, and ready for real partnership",
        dealbreakers: ["smoking", "wants kids immediately", "long distance"],
        personalityTest: {
            openness: 75,
            conscientiousness: 82,
            extraversion: 60,
            agreeableness: 88,
            neuroticism: 45
        },
        voiceIntro: {
            audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // Info placeholder
            duration: 45
        }
    }];
};

const BlindDiscoveryFeed = () => {
    const [currentProfile, setCurrentProfile] = useState<any>(null);
    const [isLoadingNext, setIsLoadingNext] = useState(false);

    useEffect(() => {
        loadNextProfile();
    }, []);

    async function loadNextProfile() {
        setIsLoadingNext(true);
        // Get next compatible match based on personality vectors
        const matches = await findCompatibleMatches(currentUser.compatibilityVector);

        if (matches.length > 0) {
            setCurrentProfile(matches[0]);
        }
        setIsLoadingNext(false);
    }

    async function handleInterested() {
        console.log('Interested in', currentProfile.name);
        // In real app: save interest, check match
        alert(`You liked ${currentProfile.name}!`);
        loadNextProfile();
    }

    function handleNotInterested() {
        console.log('Pass on', currentProfile.name);
        // In real app: log pass
        loadNextProfile();
    }

    if (isLoadingNext || !currentProfile) {
        return <div className="p-10 text-center text-stone-500 animate-pulse">Finding your next blind match...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto p-4 pb-24">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-100 relative">
                {/* No Photos - Show Blurred Placeholder */}
                <div className="h-64 bg-stone-200 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60')] bg-cover blur-xl opacity-50 contrast-125"></div>
                    <div className="relative z-10 text-center p-6 bg-white/30 backdrop-blur-md rounded-xl shadow-lg border border-white/40">
                        <span className="text-4xl mb-2 block">🔒</span>
                        <p className="font-bold text-deep-charcoal">Photos unlock after you connect</p>
                    </div>
                </div>

                <div className="p-8">
                    {/* Basic Info */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-serif font-bold text-deep-charcoal mb-1">{currentProfile.name}, {currentProfile.age}</h2>
                        <p className="text-stone-500 font-medium flex items-center">
                            <span className="mr-1">📍</span> {currentProfile.location}
                        </p>
                    </div>

                    {/* Compatibility Score */}
                    <div className="inline-flex items-center bg-green-50 text-green-700 px-4 py-2 rounded-full mb-8 border border-green-100">
                        <span className="font-bold text-lg mr-2">{currentProfile.compatibilityScore}%</span>
                        <span className="text-sm font-medium">Compatible based on personality & values</span>
                    </div>

                    {/* Voice Intro (Primary Feature) */}
                    <div className="bg-stone-50 p-5 rounded-2xl mb-8 border border-stone-100">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-3">🎤 Voice Intro</h3>
                        <audio controls src={currentProfile.voiceIntro.audioUrl} className="w-full" />
                        <p className="text-right text-xs text-stone-400 mt-2">{currentProfile.voiceIntro.duration}s</p>
                    </div>

                    {/* Personality Visualization */}
                    <div className="mb-8">
                        <h3 className="text-xl font-serif font-bold mb-4">Personality Traits</h3>
                        <div className="space-y-3">
                            {Object.entries(currentProfile.personalityTest).map(([trait, score]: [string, any]) => (
                                <div key={trait}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="capitalize font-medium text-stone-700">{trait}</span>
                                        <span className="text-stone-400">{score}/100</span>
                                    </div>
                                    <div className="w-full bg-stone-100 rounded-full h-2">
                                        <div
                                            className="bg-deep-charcoal h-2 rounded-full opacity-80"
                                            style={{ width: `${score}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* About */}
                    <div className="mb-8">
                        <h3 className="text-xl font-serif font-bold mb-3">About</h3>
                        <p className="text-lg text-stone-600 leading-relaxed italic">"{currentProfile.about}"</p>
                    </div>

                    {/* Interests */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-3">Interests</h3>
                        <div className="flex flex-wrap gap-2">
                            {currentProfile.interests.map((interest: string) => (
                                <span key={interest} className="px-3 py-1 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium border border-stone-200">
                                    {interest}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Values */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-3">Values</h3>
                        <div className="flex flex-wrap gap-2">
                            {currentProfile.values.map((value: string) => (
                                <span key={value} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium border border-purple-100">
                                    {value}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Looking For */}
                    <div className="mb-8">
                        <h3 className="text-xl font-serif font-bold mb-2">Looking For</h3>
                        <p className="text-stone-600">{currentProfile.lookingFor}</p>
                    </div>

                    {/* Deal-breakers */}
                    <div className="mb-10 bg-red-50 p-5 rounded-xl border border-red-100">
                        <h3 className="text-red-800 font-bold mb-2 flex items-center">
                            <span className="mr-2">🚫</span> Deal-breakers
                        </h3>
                        <ul className="list-disc list-inside text-red-700 space-y-1">
                            {currentProfile.dealbreakers.map((db: string, idx: number) => (
                                <li key={idx}>{db}</li>
                            ))}
                        </ul>
                    </div>

                    {/* Reputation Scores */}
                    <ReputationDisplay userId={currentProfile.userId} />

                    <div className="mt-8 p-4 bg-yellow-50 text-yellow-800 text-sm rounded-lg flex items-start">
                        <span className="mr-2 text-lg">💡</span>
                        <p>If you both express interest, you'll match and can start messaging. Photos unlock after 20 messages or mutual agreement.</p>
                    </div>
                </div>
            </div>

            {/* Floating Action Buttons */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-6 z-50">
                <button
                    onClick={handleNotInterested}
                    className="w-16 h-16 flex items-center justify-center bg-white text-stone-400 rounded-full shadow-lg border border-stone-200 hover:bg-stone-50 hover:scale-110 hover:text-red-500 transition-all duration-300"
                    aria-label="Pass"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <button
                    onClick={handleInterested}
                    className="w-20 h-20 flex items-center justify-center bg-deep-charcoal text-cinematic-beige rounded-full shadow-xl hover:bg-black hover:scale-110 transition-all duration-300 transform"
                    aria-label="Like"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
            </div>
        </div>
    );
};

export default BlindDiscoveryFeed;
