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

    useEffect(() => {
        const fetchRules = async () => {
            try {
                const response = await fetch('/api/availability/rules', {
                    headers: { 'x-auth-token': token }
                });
                if (!response.ok) throw new Error('Failed to fetch availability.');
                const data = await response.json();
                setRules(data);
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
            const response = await fetch('/api/availability/rules', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-auth-token': token 
                },
                body: JSON.stringify({ rules })
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
                    <p className="text-slate-400 mt-1">Define when you are available for bookings.</p>
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