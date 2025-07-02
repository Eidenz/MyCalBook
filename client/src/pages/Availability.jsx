import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit, Clock } from 'lucide-react';
import InputModal from '../components/common/InputModal';

const Availability = () => {
    const { token } = useAuth();
    
    // Data State
    const [schedules, setSchedules] = useState([]);
    const [selectedScheduleId, setSelectedScheduleId] = useState(null);
    const [rules, setRules] = useState([]);
    
    // UI/Loading State
    const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
    const [isLoadingRules, setIsLoadingRules] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysOfWeekShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // --- Timezone Conversion Helpers ---
    // THE FIX: Both functions now use the current date to ensure DST consistency.
    const toUTCTime = (localTime) => {
        if (!localTime) return '';
        const today = new Date();
        const localDate = new Date(`${today.toISOString().slice(0, 10)}T${localTime}`);
        return `${localDate.getUTCHours().toString().padStart(2, '0')}:${localDate.getUTCMinutes().toString().padStart(2, '0')}`;
    };
    const toLocalTime = (utcTime) => {
        if (!utcTime) return '';
        const today = new Date();
        const utcDate = new Date(`${today.toISOString().slice(0, 10)}T${utcTime}Z`);
        return `${utcDate.getHours().toString().padStart(2, '0')}:${utcDate.getMinutes().toString().padStart(2, '0')}`;
    };

    // Data Fetching
    useEffect(() => {
        const fetchSchedules = async () => {
            setIsLoadingSchedules(true);
            try {
                const response = await fetch('/api/availability/schedules', { headers: { 'x-auth-token': token } });
                if (!response.ok) throw new Error('Failed to fetch schedules.');
                const data = await response.json();
                setSchedules(data);
                if (data.length > 0 && !schedules.some(s => s.id === selectedScheduleId)) {
                    setSelectedScheduleId(data[0].id);
                }
            } catch (err) { setError(err.message); } 
            finally { setIsLoadingSchedules(false); }
        };
        fetchSchedules();
    }, [token]);

    useEffect(() => {
        const fetchRules = async () => {
            if (!selectedScheduleId) { setRules([]); return; }
            setIsLoadingRules(true);
            try {
                const response = await fetch(`/api/availability/rules/${selectedScheduleId}`, { headers: { 'x-auth-token': token } });
                if (!response.ok) throw new Error('Failed to fetch rules.');
                const data = await response.json();
                setRules(data.map(rule => ({ ...rule, start_time: toLocalTime(rule.start_time), end_time: toLocalTime(rule.end_time) })));
            } catch (err) { setError(err.message); } 
            finally { setIsLoadingRules(false); }
        };
        fetchRules();
    }, [selectedScheduleId, token]);

    // Handlers
    const handleOpenModal = (schedule = null) => {
        setEditingSchedule(schedule);
        setIsModalOpen(true);
    };

    const handleModalSubmit = async (name) => {
        const isEditing = !!editingSchedule;
        const url = isEditing ? `/api/availability/schedules/${editingSchedule.id}` : '/api/availability/schedules';
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ name: name.trim() })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        
        if (isEditing) {
            setSchedules(schedules.map(s => s.id === result.id ? result : s));
        } else {
            setSchedules([...schedules, result]);
            setSelectedScheduleId(result.id);
        }
    };

    const handleDeleteSchedule = async (scheduleToDelete) => {
        if (!window.confirm(`Are you sure you want to delete "${scheduleToDelete.name}"?`)) return;
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
    };
    
    const handleAddTimeSlot = (dayIndex) => setRules([...rules, { day_of_week: dayIndex, start_time: '09:00', end_time: '17:00' }]);
    const handleRuleChange = (index, field, value) => setRules(rules.map((r, i) => i === index ? { ...r, [field]: value } : r));
    const handleRemoveTimeSlot = (index) => setRules(rules.filter((_, i) => i !== index));

    const handleSaveRules = async () => {
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
            if (!response.ok) throw new Error((await response.json()).error);
        } catch (err) { setError(err.message); } 
        finally { setIsSaving(false); }
    };

    const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Set your availability</h1>
                    <p className="text-slate-400 mt-1 text-sm md:text-base">Manage schedules and define when you are available for bookings.</p>
                </div>
                {selectedSchedule && (
                    <button 
                        onClick={handleSaveRules} 
                        disabled={isSaving || isLoadingRules} 
                        className="w-full sm:w-auto px-4 md:px-6 py-3 md:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 active:scale-95"
                    >
                        {isSaving ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Saving...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <Clock size={16} className="hidden sm:inline" />
                                <span className="hidden sm:inline">Save</span>
                                <span className="sm:hidden">Save </span>
                                <span>{selectedSchedule.name}</span>
                            </span>
                        )}
                    </button>
                )}
            </div>
            
            {error && (
                <div 
                    className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4 cursor-pointer hover:bg-red-900/70 transition-colors animate-in slide-in-from-top-2 duration-200" 
                    onClick={() => setError('')}
                >
                    {error}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
                {/* Left: Schedules List */}
                <div className="lg:w-1/3">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg md:text-xl font-bold text-white">Schedules</h2>
                        <button 
                            onClick={() => handleOpenModal(null)} 
                            className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors active:scale-95 px-2 py-1 rounded-md hover:bg-indigo-500/10"
                        >
                            <Plus size={16}/> New
                        </button>
                    </div>
                    
                    {isLoadingSchedules ? (
                        <div className="bg-slate-800 rounded-lg p-6 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                            <p className="text-slate-400">Loading...</p>
                        </div>
                    ) : (
                        <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                            {schedules.map(schedule => (
                                <div 
                                    key={schedule.id} 
                                    onClick={() => setSelectedScheduleId(schedule.id)} 
                                    className={`flex justify-between items-center p-3 md:p-3 rounded-md cursor-pointer transition-all active:scale-[0.98] ${
                                        selectedScheduleId === schedule.id 
                                            ? 'bg-indigo-600/30 text-white shadow-md' 
                                            : 'hover:bg-slate-700/50 text-slate-300'
                                    }`}
                                >
                                    <span className="font-semibold truncate flex-1 mr-2">{schedule.name}</span>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button 
                                            onClick={(e) => {e.stopPropagation(); handleOpenModal(schedule)}} 
                                            className="p-1.5 md:p-1 text-slate-400 hover:text-white transition-colors rounded active:scale-95"
                                        >
                                            <Edit size={16}/>
                                        </button>
                                        <button 
                                            onClick={(e) => {e.stopPropagation(); handleDeleteSchedule(schedule)}} 
                                            className="p-1.5 md:p-1 text-slate-400 hover:text-red-400 transition-colors rounded active:scale-95"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {schedules.length === 0 && (
                                <div className="text-slate-500 text-center p-6">
                                    <Clock className="mx-auto mb-2 text-slate-600" size={32} />
                                    <p className="text-sm">No schedules yet.</p>
                                    <p className="text-xs mt-1">Click 'New' to create one.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Rules Editor */}
                <div className="lg:w-2/3">
                    {isLoadingRules && (
                        <div className="p-8 text-center bg-slate-800 rounded-lg">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-3"></div>
                            <p className="text-slate-400">Loading rules...</p>
                        </div>
                    )}
                    
                    {!isLoadingRules && selectedSchedule && (
                        <div className="bg-slate-800 rounded-lg shadow-lg p-4 md:p-6 space-y-4 md:space-y-6">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                                <Clock size={20} className="text-indigo-400" />
                                <h3 className="text-lg font-semibold text-white">Weekly Schedule</h3>
                            </div>
                            
                            {daysOfWeek.map((dayName, dayIndex) => {
                                const dayRules = rules.map((r, i) => ({...r, originalIndex: i})).filter(r => r.day_of_week === dayIndex);
                                return (
                                    <div key={dayIndex} className="py-3 md:py-4 border-b border-slate-700 last:border-b-0">
                                        {/* Mobile Layout */}
                                        <div className="md:hidden">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="font-semibold text-white text-sm">
                                                    {daysOfWeekShort[dayIndex]}
                                                </label>
                                                {dayRules.length === 0 && (
                                                    <span className="text-slate-500 text-xs">Unavailable</span>
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                {dayRules.map(rule => (
                                                    <div key={rule.originalIndex} className="bg-slate-700/30 p-3 rounded-lg">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <input 
                                                                type="time" 
                                                                value={rule.start_time} 
                                                                onChange={e => handleRuleChange(rule.originalIndex, 'start_time', e.target.value)} 
                                                                className="flex-1 bg-slate-700 p-2.5 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none text-white"
                                                            />
                                                            <span className="text-slate-400 font-mono">→</span>
                                                            <input 
                                                                type="time" 
                                                                value={rule.end_time} 
                                                                onChange={e => handleRuleChange(rule.originalIndex, 'end_time', e.target.value)} 
                                                                className="flex-1 bg-slate-700 p-2.5 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none text-white"
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRemoveTimeSlot(rule.originalIndex)} 
                                                            className="w-full flex items-center justify-center gap-2 p-2 text-slate-400 hover:text-red-400 transition-colors rounded active:scale-95"
                                                        >
                                                            <Trash2 size={16}/> Remove
                                                        </button>
                                                    </div>
                                                ))}
                                                <button 
                                                    onClick={() => handleAddTimeSlot(dayIndex)} 
                                                    className="w-full flex items-center justify-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-semibold p-3 border-2 border-dashed border-slate-600 rounded-lg hover:border-indigo-500 active:scale-95"
                                                >
                                                    <Plus size={16}/> Add time slot
                                                </button>
                                            </div>
                                        </div>

                                        {/* Desktop Layout */}
                                        <div className="hidden md:grid md:grid-cols-[120px_1fr] items-start gap-4">
                                            <label className="font-semibold text-white mt-2">{dayName}</label>
                                            <div className="space-y-3">
                                                {dayRules.length === 0 && <p className="text-slate-500 mt-2">Unavailable</p>}
                                                {dayRules.map(rule => (
                                                    <div key={rule.originalIndex} className="flex items-center gap-2">
                                                        <input 
                                                            type="time" 
                                                            value={rule.start_time} 
                                                            onChange={e => handleRuleChange(rule.originalIndex, 'start_time', e.target.value)} 
                                                            className="w-full bg-slate-700 p-2 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors text-white"
                                                        />
                                                        <span className="text-slate-400">-</span>
                                                        <input 
                                                            type="time" 
                                                            value={rule.end_time} 
                                                            onChange={e => handleRuleChange(rule.originalIndex, 'end_time', e.target.value)} 
                                                            className="w-full bg-slate-700 p-2 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors text-white"
                                                        />
                                                        <button 
                                                            onClick={() => handleRemoveTimeSlot(rule.originalIndex)} 
                                                            className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded active:scale-95"
                                                        >
                                                            <Trash2 size={20}/>
                                                        </button>
                                                    </div>
                                                ))}
                                                <button 
                                                    onClick={() => handleAddTimeSlot(dayIndex)} 
                                                    className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-semibold active:scale-95"
                                                >
                                                    <Plus size={16}/> Add interval
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {!selectedSchedule && !isLoadingSchedules && (
                        <div className="p-8 text-center text-slate-500 bg-slate-800 rounded-lg">
                            <Clock className="mx-auto mb-3 text-slate-600" size={48} />
                            <h3 className="text-lg font-semibold mb-2">No Schedule Selected</h3>
                            <p className="text-sm">Select or create a schedule to begin setting your availability.</p>
                        </div>
                    )}
                </div>
            </div>
            
            <InputModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalSubmit}
                title={editingSchedule ? 'Rename Schedule' : 'Create New Schedule'}
                label="Schedule Name"
                initialValue={editingSchedule ? editingSchedule.name : ''}
                placeholder={editingSchedule ? '' : "e.g., Weekends"}
            />
        </div>
    );
};

export default Availability;