import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2 } from 'lucide-react';

const Availability = () => {
    const { token } = useAuth();
    const [rules, setRules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    /**
     * Converts a 'HH:mm' time string from the user's local timezone to a UTC 'HH:mm' string.
     * @param {string} localTime - The time string to convert, e.g., "09:00".
     * @returns {string} The converted time string in UTC, e.g., "13:00".
     */
    const toUTCTime = (localTime) => {
        if (!localTime) return '';
        const today = new Date();
        const localDate = new Date(`${today.toISOString().slice(0, 10)}T${localTime}`);
        const h = localDate.getUTCHours().toString().padStart(2, '0');
        const m = localDate.getUTCMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    /**
     * Converts a 'HH:mm' time string from UTC to the user's local timezone 'HH:mm' string.
     * @param {string} utcTime - The UTC time string to convert, e.g., "13:00".
     * @returns {string} The converted time string in the local timezone, e.g., "09:00".
     */
    const toLocalTime = (utcTime) => {
        if (!utcTime) return '';
        const today = new Date();
        // Create a date object by explicitly stating the input time is UTC ('Z')
        const utcDate = new Date(`${today.toISOString().slice(0, 10)}T${utcTime}Z`);
        const h = utcDate.getHours().toString().padStart(2, '0');
        const m = utcDate.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    useEffect(() => {
        const fetchRules = async () => {
            try {
                const response = await fetch('/api/availability/rules', {
                    headers: { 'x-auth-token': token }
                });
                if (!response.ok) throw new Error('Failed to fetch availability.');
                const data = await response.json();
                
                // Convert fetched UTC times to local time for display
                const localRules = data.map(rule => ({
                    ...rule,
                    start_time: toLocalTime(rule.start_time),
                    end_time: toLocalTime(rule.end_time),
                }));
                setRules(localRules);

            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRules();
    }, [token]);

    const handleAddTimeSlot = (dayIndex) => {
        setRules([...rules, { day_of_week: dayIndex, start_time: '09:00', end_time: '17:00' }]);
    };

    const handleRuleChange = (index, field, value) => {
        const newRules = [...rules];
        newRules[index][field] = value;
        setRules(newRules);
    };

    const handleRemoveTimeSlot = (index) => {
        const newRules = rules.filter((_, i) => i !== index);
        setRules(newRules);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        try {
            // Convert local times from the UI to UTC before sending to the server
            const utcRules = rules.map(rule => ({
                ...rule,
                start_time: toUTCTime(rule.start_time),
                end_time: toUTCTime(rule.end_time),
            }));

            const response = await fetch('/api/availability/rules', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-auth-token': token 
                },
                body: JSON.stringify({ rules: utcRules })
            });
             if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to save availability.');
            }
            // Maybe show a success toast here later
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) return <div className="p-8">Loading availability...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Set your availability</h1>
                    <p className="text-slate-400 mt-1">Define when you are available for bookings. Times are in your local timezone.</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            
            {error && <div className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4">{error}</div>}

            <div className="bg-slate-800 rounded-lg shadow-lg p-6 space-y-6">
                {daysOfWeek.map((dayName, dayIndex) => {
                    const dayRules = rules.map((r, i) => ({...r, originalIndex: i})).filter(r => r.day_of_week === dayIndex);
                    
                    return (
                        <div key={dayIndex} className="grid grid-cols-[120px_1fr] items-start gap-4 py-4 border-b border-slate-700 last:border-b-0">
                            <label className="font-semibold text-white mt-2">{dayName}</label>
                            <div className="space-y-3">
                                {dayRules.length === 0 && <p className="text-slate-500 mt-2">Unavailable</p>}
                                {dayRules.map(rule => (
                                    <div key={rule.originalIndex} className="flex items-center gap-2">
                                        <input type="time" value={rule.start_time} onChange={e => handleRuleChange(rule.originalIndex, 'start_time', e.target.value)} className="w-full bg-slate-700 p-2 rounded-md border-2 border-slate-600"/>
                                        <span className="text-slate-400">-</span>
                                        <input type="time" value={rule.end_time} onChange={e => handleRuleChange(rule.originalIndex, 'end_time', e.target.value)} className="w-full bg-slate-700 p-2 rounded-md border-2 border-slate-600"/>
                                        <button onClick={() => handleRemoveTimeSlot(rule.originalIndex)} className="p-2 text-slate-400 hover:text-red-400 transition-colors">
                                            <Trash2 size={20}/>
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => handleAddTimeSlot(dayIndex)} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-semibold">
                                    <Plus size={16}/> Add interval
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Availability;