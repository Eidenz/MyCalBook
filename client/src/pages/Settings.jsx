import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const { token } = useAuth();
    const [settings, setSettings] = useState({ email_notifications: true });
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/settings', { headers: { 'x-auth-token': token } });
                if (!res.ok) throw new Error('Failed to fetch settings.');
                const data = await res.json();
                setSettings(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [token]);

    const handleToggleChange = async (e) => {
        const newSettings = { ...settings, email_notifications: e.target.checked };
        setSettings(newSettings);
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ email_notifications: e.target.checked }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update settings.');
            showSuccessMessage('Notification settings saved!');
        } catch (err) {
            setError(err.message);
            // Revert on failure
            setSettings(prev => ({...prev, email_notifications: !e.target.checked}));
        }
    };

    const handlePasswordChange = (e) => {
        setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError("New passwords do not match.");
            return;
        }
        try {
            const res = await fetch('/api/settings/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(passwordData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to change password.');
            showSuccessMessage(data.message);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); // Clear fields
        } catch (err) {
            setError(err.message);
        }
    };

    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 3000);
    };

    if (isLoading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Settings</h1>
            
            {error && <div className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4">{error}</div>}
            {success && <div className="bg-green-900/50 text-green-300 p-3 rounded-md mb-4">{success}</div>}

            <div className="bg-slate-800 rounded-lg shadow-lg p-6 space-y-8">
                {/* Email Notifications Section */}
                <div>
                    <h2 className="text-xl font-semibold mb-2">Email Notifications</h2>
                    <div className="flex items-center justify-between bg-slate-700/50 p-4 rounded-lg">
                        <p className="text-slate-300">Notify me about new bookings</p>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={settings.email_notifications} onChange={handleToggleChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>

                {/* Change Password Section */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Change Password</h2>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Current Password" required className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
                        <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="New Password" required className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
                        <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Confirm New Password" required className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
                        <div className="flex justify-end">
                            <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-white hover:opacity-90 transition">
                                Update Password
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Settings;