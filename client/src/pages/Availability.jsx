import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit } from 'lucide-react';

const Availability = () => {
    const { token } = useAuth();
    
    // State
    const [schedules, setSchedules] = useState([]);
    const [selectedScheduleId, setSelectedScheduleId] = useState(null);
    const [rules, setRules] = useState([]);
    
    // UI/Loading State
    const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
    const [isLoadingRules, setIsLoadingRules] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // --- Timezone Conversion Helpers ---
    const toUTCTime = (localTime) => {
        if (!localTime) return '';
        const today = new Date();
        const localDate = new Date(`${today.toISOString().slice(0, 10)}T${localTime}`);
        const h = localDate.getUTCHours().toString().padStart(2, '0');
        const m = localDate.getUTCMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    const toLocalTime = (utcTime) => {
        if (!utcTime) return '';
        const today = new Date();
        const utcDate = new Date(`${today.toISOString().slice(0, 10)}T${utcTime}Z`);
        const h = utcDate.getHours().toString().padStart(2, '0');
        const m = utcDate.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    // --- Data Fetching ---
    const fetchSchedules = useCallback(async () => {
        setIsLoadingSchedules(true);
        try {
            const response = await fetch('/api/availability/schedules', { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Failed to fetch schedules.');
            const data = await response.json();
            setSchedules(data);
            if (data.length > 0 && !selectedScheduleId) {
                setSelectedScheduleId(data[0].id);
            }
        } catch (err) { setError(err.message); } 
        finally { setIsLoadingSchedules(false); }
    }, [token, selectedScheduleId]);

    useEffect(() => {
        fetchSchedules();
    }, []); // Run only on initial mount

    useEffect(() => {
        const fetchRules = async () => {
            if (!selectedScheduleId) {
                setRules([]);
                return;
            };
            setIsLoadingRules(true);
            try {
                const response = await fetch(`/api/availability/rules/${selectedScheduleId}`, { headers: { 'x-auth-token': token } });
                if (!response.ok) throw new Error('Failed to fetch availability rules.');
                const data = await response.json();
                const localRules = data.map(rule => ({ ...rule, start_time: toLocalTime(rule.start_time), end_time: toLocalTime(rule.end_time) }));
                setRules(localRules);
            } catch (err) { setError(err.message); } 
            finally { setIsLoadingRules(false); }
        };
        fetchRules();
    }, [selectedScheduleId, token]);

    // --- Handlers ---
    const handleAddSchedule = async () => {
        const name = prompt("Enter a name for the new schedule (e.g., 'Weekends'):");
        if (name && name.trim()) {
            try {
                const res = await fetch('/api/availability/schedules', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify({ name: name.trim() })
                });
                const newSchedule = await res.json();
                if (!res.ok) throw new Error(newSchedule.error);
                setSchedules([...schedules, newSchedule]);
                setSelectedScheduleId(newSchedule.id);
            } catch (err) { setError(err.message); }
        }
    };

    const handleDeleteSchedule = async (scheduleToDelete) => {
        if (window.confirm(`Are you sure you want to delete the schedule "${scheduleToDelete.name}"? This cannot be undone.`)) {
             try {
                const res = await fetch(`/api/availability/schedules/${scheduleToDelete.id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                const newSchedules = schedules.filter(s => s.id !== scheduleToDelete.id);
                setSchedules(newSchedules);

                if (selectedScheduleId === scheduleToDelete.id) {
                    setSelectedScheduleId(newSchedules.length > 0 ? newSchedules[0].id : null);
                }
            } catch (err) { setError(err.message); }
        }
    };
    
    const handleAddTimeSlot = (dayIndex) => setRules([...rules, { day_of_week: dayIndex, start_time: '09:00', end_time: '17:00' }]);
    const handleRuleChange = (index, field, value) => {
        const newRules = [...rules];
        newRules[index][field] = value;
        setRules(newRules);
    };
    const handleRemoveTimeSlot = (index) => setRules(rules.filter((_, i) => i !== index));

    const handleSave = async () => {
        if (!selectedScheduleId) return;
        setIsSaving(true);
        setError('');
        try {
            const utcRules = rules.map(rule => ({...rule, start_time: toUTCTime(rule.start_time), end_time: toUTCTime(rule.end_time) }));
            const response = await fetch(`/api/availability/rules/${selectedScheduleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ rules: utcRules })
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to save availability.');
            }
        } catch (err) { setError(err.message); } 
        finally { setIsSaving(false); }
    };

    const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);

    if (isLoadingSchedules) return <div className="p-8">Loading schedules...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Set your availability</h1>
                    <p className="text-slate-400 mt-1">Manage schedules and define when you are available for bookings.</p>
                </div>
                {selectedSchedule && (
                    <button onClick={handleSave} disabled={isSaving || isLoadingRules} className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-white hover:opacity-90 transition disabled:opacity-50">
                        {isSaving ? 'Saving...' : `Save "${selectedSchedule.name}"`}
                    </button>
                )}
            </div>
            
            {error && <div className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4" onClick={() => setError('')}>{error}</div>}

            <div className="flex flex-col md:flex-row gap-8">
                {/* Left: Schedules List */}
                <div className="md:w-1/3">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xl font-bold">Schedules</h2>
                        <button onClick={handleAddSchedule} className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"><Plus size={16}/> New</button>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                         {schedules.map(schedule => (
                            <div key={schedule.id} onClick={() => setSelectedScheduleId(schedule.id)} className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors ${selectedScheduleId === schedule.id ? 'bg-indigo-600/30 text-white' : 'hover:bg-slate-700/50 text-slate-300'}`}>
                                <span className="font-semibold">{schedule.name}</span>
                                <button onClick={(e) => {e.stopPropagation(); handleDeleteSchedule(schedule)}} className="p-1 text-slate-400 hover:text-red-400"><Trash2 size={16}/></button>
                            </div>
                         ))}
                         {schedules.length === 0 && <p className="text-slate-500 text-center p-4">No schedules found. Click 'New' to create one.</p>}
                    </div>
                </div>

                {/* Right: Rules Editor */}
                <div className="md:w-2/3">
                    {isLoadingRules && <div className="p-8 text-center">Loading rules...</div>}
                    {!isLoadingRules && selectedSchedule && (
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
                                                    <button onClick={() => handleRemoveTimeSlot(rule.originalIndex)} className="p-2 text-slate-400 hover:text-red-400"><Trash2 size={20}/></button>
                                                </div>
                                            ))}
                                            <button onClick={() => handleAddTimeSlot(dayIndex)} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-semibold"><Plus size={16}/> Add interval</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {!selectedSchedule && !isLoadingSchedules && <div className="p-8 text-center text-slate-500 bg-slate-800 rounded-lg">Select a schedule to edit its rules or create a new one.</div>}
                </div>
            </div>
        </div>
    );
};

export default Availability;