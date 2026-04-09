import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from '../components/common/ConfirmationModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Shield, ShieldOff, Copy, Download, KeyRound, Check, UploadCloud, Loader, Plus, Trash2, AlertTriangle } from 'lucide-react';

// Sub-component for ICS import
const CalendarImport = ({ token }) => {
    const [file, setFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState({ message: '', type: '' }); // type can be 'success' or 'error'

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.type === "text/calendar" || selectedFile.name.endsWith(".ics"))) {
            setFile(selectedFile);
            setImportStatus({ message: '', type: '' });
        } else {
            setFile(null);
            if (selectedFile) {
                setImportStatus({ message: 'Please select a valid .ics file.', type: 'error' });
            }
        }
    };
    
    const handleImport = async () => {
        if (!file) {
            setImportStatus({ message: 'No file selected.', type: 'error' });
            return;
        }
        
        setIsImporting(true);
        setImportStatus({ message: '', type: '' });
        
        const formData = new FormData();
        formData.append('icsfile', file);
        
        try {
            const res = await fetch('/api/events/import-ics', {
                method: 'POST',
                headers: { 'x-auth-token': token },
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setImportStatus({ message: data.message, type: 'success' });
        } catch (err) {
            setImportStatus({ message: err.message, type: 'error' });
        } finally {
            setIsImporting(false);
            setFile(null);
            document.getElementById('ics-upload').value = ''; // Reset file input
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-2">Import Calendar</h2>
            <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-4 text-sm">Import events from an external calendar using an .ics file.</p>
            <div className="bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <input type="file" id="ics-upload" accept=".ics,text/calendar" onChange={handleFileChange} className="hidden" />
                    <label htmlFor="ics-upload" className="flex-1 w-full text-center px-4 py-2 bg-slate-300 dark:bg-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-400 dark:hover:bg-slate-500 cursor-pointer truncate flex items-center justify-center gap-2">
                        <UploadCloud size={16} />
                        {file ? file.name : "Choose .ics file"}
                    </label>
                    <button onClick={handleImport} disabled={isImporting || !file} className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                        {isImporting ? <><Loader size={16} className="animate-spin" /> Importing...</> : "Import"}
                    </button>
                </div>
                {importStatus.message && (
                    <div className={`mt-4 text-sm p-2 rounded-md ${importStatus.type === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'}`}>
                        {importStatus.message}
                    </div>
                )}
            </div>
        </div>
    );
};


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
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-red-600 rounded-lg text-sm font-semibold text-white hover:bg-red-700">
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
                    <button onClick={() => setSetupStage('recovery')} className="px-4 py-2 bg-indigo-500 rounded-lg text-sm font-semibold text-white hover:bg-indigo-600">Next</button>
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
                    <button onClick={() => setSetupStage('verify')} className="px-4 py-2 bg-indigo-500 rounded-lg text-sm font-semibold text-white hover:bg-indigo-600">Next</button>
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
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2.5 bg-green-600 rounded-lg font-semibold text-white hover:bg-green-700">
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
            <button onClick={handleGenerate} disabled={isSubmitting} className="px-4 py-2 bg-indigo-500 rounded-lg text-sm font-semibold text-white hover:bg-indigo-600">
                {isSubmitting ? 'Generating...' : 'Enable'}
            </button>
        </div>
    );
};


// Manage persistent API keys for third-party integrations (desktop widgets,
// scripts, etc). Plaintext keys are only ever shown once at creation time.
const ApiKeyManager = ({ token }) => {
    const [keys, setKeys] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [newKeyName, setNewKeyName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [justCreated, setJustCreated] = useState(null); // { id, name, key }
    const [hasCopied, setHasCopied] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const fetchKeys = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/settings/api-keys', {
                headers: { 'x-auth-token': token },
            });
            if (!res.ok) throw new Error('Failed to load API keys.');
            const data = await res.json();
            setKeys(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;
        setIsCreating(true);
        setError('');
        try {
            const res = await fetch('/api/settings/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ name: newKeyName.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create API key.');
            setJustCreated(data);
            setNewKeyName('');
            await fetchKeys();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id) => {
        setError('');
        try {
            const res = await fetch(`/api/settings/api-keys/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token },
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to revoke API key.');
            }
            setPendingDeleteId(null);
            await fetchKeys();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCopyKey = () => {
        if (!justCreated?.key) return;
        navigator.clipboard.writeText(justCreated.key);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    const formatDate = (iso) => {
        if (!iso) return 'Never';
        return new Date(iso).toLocaleString();
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-2">API Keys</h2>
            <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-4 text-sm">
                Persistent tokens for third-party integrations like the KDE desktop widget. Send them in the <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded">x-api-key</span> header (or as <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded">Authorization: Bearer …</span>). Unlike the web session token, API keys never expire until you revoke them.
            </p>

            {error && (
                <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-md mb-3 text-sm">{error}</div>
            )}

            {justCreated && (
                <div className="space-y-3 bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-amber-500/40 mb-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="text-amber-400" size={20} />
                        <h3 className="font-semibold text-amber-700 dark:text-amber-300">Copy this key now</h3>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        This is the only time the full key for <span className="font-semibold">{justCreated.name}</span> will be shown. Store it somewhere safe.
                    </p>
                    <div className="font-mono bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs break-all text-slate-700 dark:text-slate-200">
                        {justCreated.key}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={handleCopyKey} className="flex items-center gap-2 px-4 py-2 bg-slate-300 dark:bg-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-400 dark:hover:bg-slate-500">
                            {hasCopied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy</>}
                        </button>
                        <button onClick={() => setJustCreated(null)} className="px-4 py-2 bg-indigo-500 rounded-lg text-sm font-semibold text-white hover:bg-indigo-600">
                            Done
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key name (e.g., KDE Desktop Widget)"
                    maxLength={100}
                    className="flex-1 bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"
                />
                <button
                    type="submit"
                    disabled={isCreating || !newKeyName.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isCreating ? <><Loader size={16} className="animate-spin" /> Creating...</> : <><Plus size={16} /> Create Key</>}
                </button>
            </form>

            <div className="space-y-2">
                {isLoading ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500">Loading keys...</p>
                ) : keys.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">No API keys yet.</p>
                ) : (
                    keys.map((k) => (
                        <div key={k.id} className="bg-slate-200/50 dark:bg-slate-700/50 p-3 rounded-lg">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-900 dark:text-white truncate">{k.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{k.prefix}…</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Created {formatDate(k.created_at)} · Last used {formatDate(k.last_used_at)}
                                    </p>
                                </div>
                                {pendingDeleteId === k.id ? (
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => handleDelete(k.id)}
                                            className="px-3 py-1.5 bg-red-600 rounded-lg text-xs font-semibold text-white hover:bg-red-700"
                                        >
                                            Confirm
                                        </button>
                                        <button
                                            onClick={() => setPendingDeleteId(null)}
                                            className="px-3 py-1.5 bg-slate-300 dark:bg-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-400 dark:hover:bg-slate-500"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setPendingDeleteId(k.id)}
                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg shrink-0"
                                        aria-label="Revoke API key"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};


const Settings = () => {
    const { token, logout, user } = useAuth();
    const [settings, setSettings] = useState({ email_notifications: true, is_two_factor_enabled: false, booking_page_subtitle: '' });
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

    if (isLoading) return (
        <div className="p-8">
            <LoadingSpinner size={32} text="Loading settings..." className="py-16" />
        </div>
    );

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Settings</h1>
            
            {error && <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">{error}</div>}
            {success && <div className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 p-3 rounded-md mb-4">{success}</div>}

            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-lg p-6 space-y-8">
                <div>
                    <h2 className="text-xl font-semibold mb-4">Profile</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50 p-4 rounded-lg">
                            <p className="text-slate-600 dark:text-slate-300">Notify me about new bookings</p>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={settings.email_notifications} onChange={handleToggleChange} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                            </label>
                        </div>
                        <div className="bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50 p-4 rounded-lg">
                            <label className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">Booking Page Subtitle</label>
                            <input
                                type="text"
                                value={settings.booking_page_subtitle || ''}
                                onChange={(e) => setSettings(prev => ({...prev, booking_page_subtitle: e.target.value}))}
                                onBlur={async () => {
                                    try {
                                        const res = await fetch('/api/settings', {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                                            body: JSON.stringify({ booking_page_subtitle: settings.booking_page_subtitle }),
                                        });
                                        if (!res.ok) throw new Error('Failed to update subtitle.');
                                        showSuccessMessage('Booking page subtitle saved!');
                                    } catch (err) { setError(err.message); }
                                }}
                                placeholder="e.g., Choose a time that works for you!"
                                className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"
                            />
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">Optional subtitle shown on your public booking page ({user ? `/u/${user.username}` : ''}).</p>
                        </div>
                    </div>
                </div>
                
                <CalendarImport token={token} />

                <ApiKeyManager token={token} />

                <div>
                    <h2 className="text-xl font-semibold mb-4">Change Password</h2>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Current Password" required className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                        <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="New Password" required className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                        <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Confirm New Password" required className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                        <div className="flex justify-end">
                            <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-white hover:opacity-90 transition">
                                Update Password
                            </button>
                        </div>
                    </form>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-2">Two-Factor Authentication</h2>
                    <TwoFactorAuthSetup 
                        token={token} 
                        isEnabled={settings.is_two_factor_enabled}
                        onUpdate={handle2faUpdate}
                    />
                </div>

                <div className="border-t border-red-500/30 pt-6">
                     <h2 className="text-xl font-semibold mb-2 text-red-700 dark:text-red-300">Delete Account</h2>
                     <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-4 text-sm">Once you delete your account, all of your data will be permanently removed. This action cannot be undone.</p>
                     <div className="flex justify-end">
                        <button onClick={() => setIsDeleteModalOpen(true)} className="px-6 py-2.5 bg-red-600 rounded-lg font-semibold text-white hover:bg-red-700 transition">
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