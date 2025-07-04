import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { Shield, ShieldOff, Copy, Download, KeyRound, Check } from 'lucide-react';

// A sub-component for the 2FA setup flow
const TwoFactorAuthSetup = ({ token, isEnabled, onUpdate }) => {
    const [setupStage, setSetupStage] = useState('idle'); // 'idle', 'generated', 'recovery', 'verify'
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState([]);
    const [otp, setOtp] = useState('');
    const [disablePassword, setDisablePassword] = useState('');
    const [disableOtp, setDisableOtp] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);

    const handleGenerate = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/settings/2fa/generate', {
                method: 'POST',
                headers: { 'x-auth-token': token },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setQrCode(data.qrCode);
            setSecret(data.secret);
            setRecoveryCodes(data.recoveryCodes);
            setSetupStage('generated');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/settings/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSetupStage('idle');
            onUpdate(true, '2FA has been enabled successfully!');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDisable = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/settings/2fa/disable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ password: disablePassword, otp: disableOtp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSetupStage('idle');
            setDisablePassword('');
            setDisableOtp('');
            onUpdate(false, '2FA has been disabled.');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(recoveryCodes.join('\n'));
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    const handleDownloadCodes = () => {
        const text = recoveryCodes.join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mycalbook-recovery-codes.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const resetFlow = () => {
        setSetupStage('idle');
        setError('');
    };

    if (isEnabled && setupStage !== 'disabling') {
        return (
            <div className="flex items-center justify-between bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <Shield className="text-green-400" size={24} />
                    <div>
                        <p className="font-semibold text-slate-900 dark:text-white">2FA is Enabled</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">Your account is protected.</p>
                    </div>
                </div>
                <button onClick={() => setSetupStage('disabling')} className="px-4 py-2 bg-slate-300 dark:bg-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-400 dark:hover:bg-slate-500">Disable</button>
            </div>
        );
    }
    
    if (setupStage === 'disabling') {
        return (
            <form onSubmit={handleDisable} className="space-y-3 bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-red-500/30">
                 <h3 className="font-semibold text-slate-900 dark:text-white">Disable Two-Factor Authentication</h3>
                <input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} placeholder="Current Password" required className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                <input type="text" value={disableOtp} onChange={(e) => setDisableOtp(e.target.value)} placeholder="Authentication Code" required className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                {error && <div className="text-red-400 text-sm">{error}</div>}
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={resetFlow} className="px-4 py-2 bg-slate-300 dark:bg-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-400 dark:hover:bg-slate-500">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-red-800 rounded-lg text-sm font-semibold hover:bg-red-700">
                        {isSubmitting ? 'Disabling...' : 'Confirm & Disable'}
                    </button>
                </div>
            </form>
        );
    }

    if (setupStage === 'generated') {
        return (
            <div className="space-y-4 bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                <p className="font-semibold text-slate-600 dark:text-slate-300">1. Scan QR Code</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">Scan this image with your preferred authenticator app.</p>
                <div className="bg-white p-2 rounded-lg inline-block mx-auto">
                    <img src={qrCode} alt="2FA QR Code" />
                </div>
                <p className="font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded text-center tracking-widest text-sm overflow-x-auto">{secret}</p>
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={resetFlow} className="px-4 py-2 bg-slate-300 dark:bg-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-400 dark:hover:bg-slate-500">Cancel</button>
                    <button onClick={() => setSetupStage('recovery')} className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-700">Next</button>
                </div>
            </div>
        );
    }

    if (setupStage === 'recovery') {
        return (
            <div className="space-y-4 bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-amber-500/30">
                <div className="flex items-center gap-2"><KeyRound className="text-amber-400" size={20}/><h3 className="font-semibold text-amber-700 dark:text-amber-300">2. Save Your Recovery Codes</h3></div>
                <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">Store these codes in a safe place. They are your only way to access your account if you lose your device.</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono bg-slate-100 dark:bg-slate-800 p-4 rounded text-center text-slate-600 dark:text-slate-300">
                    {recoveryCodes.map(code => <span key={code}>{code}</span>)}
                </div>
                <div className="flex gap-2">
                    <button onClick={handleCopyToClipboard} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-300 dark:bg-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-400 dark:hover:bg-slate-500">
                        {hasCopied ? <><Check size={16}/> Copied!</> : <><Copy size={16}/> Copy</>}
                    </button>
                    <button onClick={handleDownloadCodes} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-300 dark:bg-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-400 dark:hover:bg-slate-500">
                        <Download size={16}/> Download
                    </button>
                </div>
                 <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setSetupStage('generated')} className="px-4 py-2 bg-slate-300 dark:bg-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-400 dark:hover:bg-slate-500">Back</button>
                    <button onClick={() => setSetupStage('verify')} className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-700">Next</button>
                </div>
            </div>
        );
    }
    
    if (setupStage === 'verify') {
         return (
            <div className="space-y-4 bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-600 dark:text-slate-300">3. Verify & Enable</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">To finish setup, enter the 6-digit code from your authenticator app.</p>
                <form onSubmit={handleVerify} className="flex flex-col gap-3">
                    <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" required className="flex-grow bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                    {error && <div className="text-red-400 text-sm pt-2">{error}</div>}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setSetupStage('recovery')} className="px-4 py-2.5 bg-slate-300 dark:bg-slate-600 rounded-lg font-semibold hover:bg-slate-400 dark:hover:bg-slate-500">Back</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2.5 bg-green-600 rounded-lg font-semibold hover:bg-green-700">
                            {isSubmitting ? 'Verifying...' : 'Verify & Enable'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50 p-4 rounded-lg">
             <div className="flex items-center gap-3">
                <ShieldOff className="text-slate-400 dark:text-slate-500 dark:text-slate-400" size={24} />
                <div>
                    <p className="font-semibold text-slate-900 dark:text-white">2FA is Disabled</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">Add an extra layer of security.</p>
                </div>
            </div>
            <button onClick={handleGenerate} disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-700">
                {isSubmitting ? 'Generating...' : 'Enable'}
            </button>
        </div>
    );
};


const Settings = () => {
    const { token, logout } = useAuth();
    const [settings, setSettings] = useState({ email_notifications: true, is_two_factor_enabled: false });
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
    
    useEffect(() => {
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
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setError(err.message);
        }
    };
    
    const handleDeleteAccount = async () => {
        setIsDeleteModalOpen(false);
        setError('');
        try {
            const res = await fetch('/api/settings/account', {
                method: 'DELETE',
                headers: { 'x-auth-token': token },
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete account.');
            }
            logout();
        } catch (err) {
            setError(err.message);
        }
    };

    const handle2faUpdate = (newStatus, message) => {
        setSettings(prev => ({ ...prev, is_two_factor_enabled: newStatus }));
        showSuccessMessage(message);
    };

    const showSuccessMessage = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 3000);
    };

    if (isLoading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Settings</h1>
            
            {error && <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">{error}</div>}
            {success && <div className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 p-3 rounded-md mb-4">{success}</div>}

            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-lg p-6 space-y-8">
                <div>
                    <h2 className="text-xl font-semibold mb-2">Two-Factor Authentication</h2>
                    <TwoFactorAuthSetup 
                        token={token} 
                        isEnabled={settings.is_two_factor_enabled}
                        onUpdate={handle2faUpdate}
                    />
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-2">Email Notifications</h2>
                    <div className="flex items-center justify-between bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50 p-4 rounded-lg">
                        <p className="text-slate-600 dark:text-slate-300">Notify me about new bookings</p>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={settings.email_notifications} onChange={handleToggleChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-4">Change Password</h2>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Current Password" required className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                        <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="New Password" required className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                        <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Confirm New Password" required className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                        <div className="flex justify-end">
                            <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-slate-900 dark:text-white hover:opacity-90 transition">
                                Update Password
                            </button>
                        </div>
                    </form>
                </div>

                <div className="border-t border-red-500/30 pt-6">
                     <h2 className="text-xl font-semibold mb-2 text-red-700 dark:text-red-300">Delete Account</h2>
                     <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-4 text-sm">Once you delete your account, all of your data will be permanently removed. This action cannot be undone.</p>
                     <div className="flex justify-end">
                        <button onClick={() => setIsDeleteModalOpen(true)} className="px-6 py-2.5 bg-red-800 rounded-lg font-semibold text-slate-900 dark:text-white hover:bg-red-700 transition">
                            Delete My Account
                        </button>
                    </div>
                </div>
            </div>
            
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteAccount}
                title="Confirm Account Deletion"
                message="Are you absolutely sure? All of your event types, availability schedules, and bookings will be permanently deleted."
                confirmText="Yes, delete my account"
            />
        </div>
    );
};

export default Settings;