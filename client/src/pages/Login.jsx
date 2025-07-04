import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [otp, setOtp] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for the 2FA flow
    const [tfaRequired, setTfaRequired] = useState(false);
    const [tfaToken, setTfaToken] = useState('');
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    
    const { setAuthToken } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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
                setTfaRequired(true);
                setTfaToken(data.tfaToken);
            } else {
                setAuthToken(data.token);
                navigate('/');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTfaSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const url = isRecoveryMode ? '/api/auth/2fa/recover' : '/api/auth/2fa/verify';
        const body = isRecoveryMode ? { tfaToken, recoveryCode } : { tfaToken, otp };

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Verification failed');
            
            setAuthToken(data.token);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-lg">
                {tfaRequired ? (
                    <>
                        <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white">{isRecoveryMode ? 'Enter Recovery Code' : 'Two-Factor Authentication'}</h1>
                        <p className="text-sm text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                            {isRecoveryMode ? 'Enter one of your emergency recovery codes.' : 'Enter the code from your authenticator app.'}
                        </p>
                        { isRecoveryMode ? (
                            <p className="text-sm text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">Using a recovery code will disable two-factor authentication.</p>
                        ) : <></>}
                        <form onSubmit={handleTfaSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">{isRecoveryMode ? 'Recovery Code' : 'Authentication Code'}</label>
                                <input
                                    type="text"
                                    required
                                    value={isRecoveryMode ? recoveryCode : otp}
                                    onChange={(e) => isRecoveryMode ? setRecoveryCode(e.target.value) : setOtp(e.target.value)}
                                    className="w-full px-3 py-2 mt-1 text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:border-indigo-500"
                                    autoComplete="one-time-code"
                                    inputMode={isRecoveryMode ? "text" : "numeric"}
                                />
                            </div>
                            {error && <div className="text-red-400 text-sm p-3 bg-red-100 dark:bg-red-900/50 rounded-md">{error}</div>}
                            <button type="submit" disabled={isSubmitting} className="w-full py-2 font-semibold text-slate-900 dark:text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md hover:opacity-90 transition disabled:opacity-50">
                                {isSubmitting ? 'Verifying...' : 'Verify & Log In'}
                            </button>
                        </form>
                         <button onClick={() => { setIsRecoveryMode(!isRecoveryMode); setError(''); }} className="text-sm text-center text-indigo-600 dark:text-indigo-400 hover:underline w-full mt-2">
                            {isRecoveryMode ? 'Use an authentication code' : 'Use a recovery code'}
                        </button>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white">Welcome Back</h1>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Email</label>
                                <input type="email" name="email" required onChange={handleChange} className="w-full px-3 py-2 mt-1 text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Password</label>
                                <input type="password" name="password" required onChange={handleChange} className="w-full px-3 py-2 mt-1 text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:border-indigo-500" />
                            </div>
                            {error && <div className="text-red-400 text-sm p-3 bg-red-100 dark:bg-red-900/50 rounded-md">{error}</div>}
                            <button type="submit" disabled={isSubmitting} className="w-full py-2 font-semibold text-slate-900 dark:text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md hover:opacity-90 transition disabled:opacity-50">
                                {isSubmitting ? 'Logging in...' : 'Log In'}
                            </button>
                        </form>
                        <p className="text-sm text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
                            Don't have an account? <Link to="/register" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Register here</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default Login;