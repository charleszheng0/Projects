import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AuthProps {
    isSignup: boolean;
}

const Auth: React.FC<AuthProps> = ({ isSignup }) => {
    const { login, signup } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [age, setAge] = useState('');
    const [city, setCity] = useState('');
    const [gender, setGender] = useState('female');
    const [interestedIn, setInterestedIn] = useState('male');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignup) {
                await signup({
                    email, password, display_name: displayName, age: parseInt(age), city, gender, interested_in: interestedIn
                });
            } else {
                await login({ email, password });
            }
            navigate('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-sm w-full max-w-md">
                <h2 className="text-3xl font-serif mb-6 text-center">
                    {isSignup ? 'Begin Transparency' : 'Welcome Back'}
                </h2>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-stone-500"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-stone-500"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    {isSignup && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-stone-500"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-stone-500"
                                        value={age}
                                        onChange={e => setAge(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-stone-500"
                                        value={city}
                                        onChange={e => setCity(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">I am</label>
                                    <select
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-stone-500"
                                        value={gender}
                                        onChange={e => setGender(e.target.value)}
                                    >
                                        <option value="female">Female</option>
                                        <option value="male">Male</option>
                                        <option value="non-binary">Non-binary</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Interested in</label>
                                    <select
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-stone-500"
                                        value={interestedIn}
                                        onChange={e => setInterestedIn(e.target.value)}
                                    >
                                        <option value="male">Men</option>
                                        <option value="female">Women</option>
                                        <option value="everyone">Everyone</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-deep-charcoal text-white py-3 rounded hover:bg-opacity-90 transition font-medium"
                    >
                        {loading ? 'Processing...' : (isSignup ? 'Join' : 'Login')}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-gray-600">
                    {isSignup ? "Already have an account? " : "Don't have an account? "}
                    <Link to={isSignup ? "/login" : "/signup"} className="underline hover:text-deep-charcoal">
                        {isSignup ? "Login here" : "Join here"}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Auth;
