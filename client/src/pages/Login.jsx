import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { setAuthToken } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
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
            
            setAuthToken(data.token);
            navigate('/'); // Redirect to calendar on successful login
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-xl shadow-lg">
                <h1 className="text-2xl font-bold text-center text-white">Welcome Back</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Form fields... */}
                     <div>
                        <label className="text-sm font-medium text-slate-300">Email</label>
                        <input type="email" name="email" required onChange={handleChange}
                               className="w-full px-3 py-2 mt-1 text-white bg-slate-700 border-2 border-slate-600 rounded-md focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-300">Password</label>
                        <input type="password" name="password" required onChange={handleChange}
                               className="w-full px-3 py-2 mt-1 text-white bg-slate-700 border-2 border-slate-600 rounded-md focus:outline-none focus:border-indigo-500" />
                    </div>
                    {error && <div className="text-red-400 text-sm p-3 bg-red-900/50 rounded-md">{error}</div>}
                    <button type="submit" disabled={isSubmitting}
                            className="w-full py-2 font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md hover:opacity-90 transition disabled:opacity-50">
                        {isSubmitting ? 'Logging in...' : 'Log In'}
                    </button>
                </form>
                <p className="text-sm text-center text-slate-400">
                    Don't have an account? <Link to="/register" className="font-medium text-indigo-400 hover:underline">Register here</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;