import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    // State for the password form
    const [formData, setFormData] = useState({ email: '', password: '' });
    
    // State for the 2FA form
    const [otp, setOtp] = useState('');
    const [tfaRequired, setTfaRequired] = useState(false);
    const [tfaToken, setTfaToken] = useState('');

    // Shared state
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { setAuthToken } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // Step 1: Handle password submission
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong');
            
            if (data.tfaRequired) {
                // 2FA is enabled, show the OTP form
                setTfaRequired(true);
                setTfaToken(data.tfaToken);
            } else {
                // No 2FA, login is complete
                setAuthToken(data.token);
                navigate('/');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Step 2: Handle 2FA OTP submission
    const handleTfaSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/auth/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tfaToken, otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Verification failed');
            
            // 2FA successful, login is complete
            setAuthToken(data.token);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-xl shadow-lg">
                {tfaRequired ? (
                    <>
                        <h1 className="text-2xl font-bold text-center text-white">Two-Factor Authentication</h1>
                        <p className="text-sm text-center text-slate-400">Enter the code from your authenticator app.</p>
                        <form onSubmit={handleTfaSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-300">Authentication Code</label>
                                <input
                                    type="text"
                                    name="otp"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full px-3 py-2 mt-1 text-white bg-slate-700 border-2 border-slate-600 rounded-md focus:outline-none focus:border-indigo-500"
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                />
                            </div>
                            {error && <div className="text-red-400 text-sm p-3 bg-red-900/50 rounded-md">{error}</div>}
                            <button type="submit" disabled={isSubmitting} className="w-full py-2 font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md hover:opacity-90 transition disabled:opacity-50">
                                {isSubmitting ? 'Verifying...' : 'Verify & Log In'}
                            </button>
                        </form>
                         <button onClick={() => { setTfaRequired(false); setError(''); }} className="text-sm text-center text-slate-400 hover:underline w-full mt-2">
                            Back to login
                        </button>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold text-center text-white">Welcome Back</h1>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-300">Email</label>
                                <input type="email" name="email" required onChange={handleChange} className="w-full px-3 py-2 mt-1 text-white bg-slate-700 border-2 border-slate-600 rounded-md focus:outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-300">Password</label>
                                <input type="password" name="password" required onChange={handleChange} className="w-full px-3 py-2 mt-1 text-white bg-slate-700 border-2 border-slate-600 rounded-md focus:outline-none focus:border-indigo-500" />
                            </div>
                            {error && <div className="text-red-400 text-sm p-3 bg-red-900/50 rounded-md">{error}</div>}
                            <button type="submit" disabled={isSubmitting} className="w-full py-2 font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md hover:opacity-90 transition disabled:opacity-50">
                                {isSubmitting ? 'Logging in...' : 'Log In'}
                            </button>
                        </form>
                        <p className="text-sm text-center text-slate-400">
                            Don't have an account? <Link to="/register" className="font-medium text-indigo-400 hover:underline">Register here</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default Login;