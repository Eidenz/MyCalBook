import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCalendar } from '../hooks/useCalendar';
import { format, isSameMonth, isToday, isSameDay, parseISO } from 'date-fns';
import { Plus, Trash2, Edit, Clock, Calendar, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import InputModal from '../components/common/InputModal';
import OverrideModal from '../components/availability/OverrideModal';

const Availability = () => {
    const { token } = useAuth();
    
    // Data State
    const [schedules, setSchedules] = useState([]);
    const [selectedScheduleId, setSelectedScheduleId] = useState(null);
    const [rules, setRules] = useState([]);
    const [overrides, setOverrides] = useState([]);
    
    // UI/Loading State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isOverridesLoading, setIsOverridesLoading] = useState(false);
    const [error, setError] = useState('');

    // Modal State
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
    const [selectedOverrideDate, setSelectedOverrideDate] = useState(null);

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const calendar = useCalendar();

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

    // --- Data Fetching ---
    useEffect(() => {
        const fetchSchedules = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/availability/schedules', { headers: { 'x-auth-token': token } });
                if (!response.ok) throw new Error('Failed to fetch schedules.');
                const data = await response.json();
                setSchedules(data);
                if (data.length > 0 && !selectedScheduleId) {
                    setSelectedScheduleId(data[0].id);
                }
            } catch (err) { setError(err.message); } 
            finally { setIsLoading(false); }
        };
        fetchSchedules();
    }, [token]);
    
    const fetchOverrides = useCallback(async () => {
        if (!selectedScheduleId) {
            setOverrides([]);
            return;
        }
        setIsOverridesLoading(true);
        try {
            const overridesRes = await fetch(`/api/availability/overrides/${selectedScheduleId}?month=${format(calendar.currentDate, 'yyyy-MM')}`, { headers: { 'x-auth-token': token } });
            if (!overridesRes.ok) throw new Error('Failed to fetch overrides.');
            const overridesData = await overridesRes.json();
            setOverrides(overridesData);
        } catch (err) { setError(err.message); } 
        finally { setIsOverridesLoading(false); }
    }, [selectedScheduleId, calendar.currentDate, token]);
    
    useEffect(() => {
        if (!selectedScheduleId) {
            setRules([]);
            return;
        }
        const fetchRules = async () => {
            try {
                const rulesRes = await fetch(`/api/availability/rules/${selectedScheduleId}`, { headers: { 'x-auth-token': token } });
                if (!rulesRes.ok) throw new Error('Failed to fetch rules.');
                const rulesData = await rulesRes.json();
                setRules(rulesData.map(rule => ({ ...rule, start_time: toLocalTime(rule.start_time), end_time: toLocalTime(rule.end_time) })));
            } catch (err) {
                setError(err.message);
            }
        };

        fetchRules();
        fetchOverrides();
    }, [selectedScheduleId, token, fetchOverrides]);

    useEffect(() => {
        fetchOverrides();
    }, [fetchOverrides]);

    const overridesMap = useMemo(() => {
        const map = new Map();
        overrides.forEach(o => map.set(format(parseISO(o.date), 'yyyy-MM-dd'), o));
        return map;
    }, [overrides]);
    
    // --- Handlers ---
    const handleOpenScheduleModal = (schedule = null) => {
        setEditingSchedule(schedule);
        setIsScheduleModalOpen(true);
    };

    const handleScheduleModalSubmit = async (name) => {
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
        setIsSaving(true); setError('');
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

    const handleDayClick = (day) => {
        setSelectedOverrideDate(day);
        setIsOverrideModalOpen(true);
    };

    const handleSaveOverride = async (overrideData) => {
        const payload = {
            ...overrideData,
            start_time: overrideData.is_unavailable ? null : toUTCTime(overrideData.start_time),
            end_time: overrideData.is_unavailable ? null : toUTCTime(overrideData.end_time),
        };

        const res = await fetch('/api/availability/overrides', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to save override');
        fetchOverrides();
    };

    const handleDeleteOverride = async (date) => {
        const res = await fetch(`/api/availability/overrides/${selectedScheduleId}/${date}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': token }
        });
        if (!res.ok) {
            const result = await res.json();
            throw new Error(result.error || 'Failed to delete override');
        }
        fetchOverrides();
    };

    const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">Set your availability</h1>
                <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">Manage schedules, define recurring weekly hours, and set overrides for specific dates.</p>
            </div>
            
            {error && (
                <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-md animate-fadeIn cursor-pointer" onClick={() => setError('')}>
                    {error}
                </div>
            )}

            {/* Schedules Section */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Schedules</h2>
                    <button 
                        onClick={() => handleOpenScheduleModal(null)} 
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors"
                    >
                        <Plus size={18}/> New Schedule
                    </button>
                </div>
                
                {isLoading && schedules.length === 0 ? (
                    <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400">Loading...</p>
                ) : schedules.length === 0 ? (
                    <div className="text-slate-400 dark:text-slate-500 text-center py-12">
                        <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No schedules yet.</p>
                        <p className="text-sm">Create your first schedule to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {schedules.map(schedule => (
                            <div 
                                key={schedule.id} 
                                onClick={() => setSelectedScheduleId(schedule.id)} 
                                className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                                    selectedScheduleId === schedule.id 
                                        ? 'bg-indigo-500/20 border-indigo-400' 
                                        : 'bg-slate-200/50 dark:bg-slate-700/50 border-transparent hover:bg-slate-300/70 dark:hover:bg-slate-600/70 hover:border-slate-400 dark:hover:border-slate-500'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{schedule.name}</h3>
                                    <div className="flex items-center gap-1 ml-2">
                                        <button 
                                            onClick={(e) => {e.stopPropagation(); handleOpenScheduleModal(schedule)}} 
                                            className="p-1.5 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white rounded transition-colors"
                                            title="Edit schedule"
                                        >
                                            <Edit size={16}/>
                                        </button>
                                        <button 
                                            onClick={(e) => {e.stopPropagation(); handleDeleteSchedule(schedule)}} 
                                            className="p-1.5 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-red-400 rounded transition-colors"
                                            title="Delete schedule"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                                {selectedScheduleId === schedule.id && (
                                    <div className="text-sm text-indigo-600 dark:text-indigo-300">Currently selected</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Weekly Hours Section */}
            {selectedSchedule && !isLoading && (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Weekly Hours</h2>
                            <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 text-sm mt-1">Set your regular availability for "{selectedSchedule.name}"</p>
                        </div>
                        <button 
                            onClick={handleSaveRules} 
                            disabled={isSaving || isLoading} 
                            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors"
                        >
                            {isSaving ? 'Saving...' : 'Save Rules'}
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {daysOfWeek.map((dayName, dayIndex) => {
                            const dayRules = rules.map((r, i) => ({...r, originalIndex: i})).filter(r => r.day_of_week === dayIndex);
                            return (
                                <div key={dayIndex} className="bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-semibold text-slate-900 dark:text-white">{dayName}</h3>
                                        <button 
                                            onClick={() => handleAddTimeSlot(dayIndex)} 
                                            className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded-md text-sm font-medium transition-colors"
                                        >
                                            <Plus size={16}/> Add Time
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {dayRules.length === 0 ? (
                                            <div className="text-slate-400 dark:text-slate-500 text-center py-6">
                                                <Clock size={24} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">Unavailable</p>
                                            </div>
                                        ) : (
                                            dayRules.map(rule => (
                                                <div key={rule.originalIndex} className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                                                    {/* Mobile-optimized layout */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                                                            <input 
                                                                type="time" 
                                                                value={rule.start_time} 
                                                                onChange={e => handleRuleChange(rule.originalIndex, 'start_time', e.target.value)} 
                                                                className="flex-1 min-w-0 bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white p-2 text-sm rounded-md border border-slate-400 dark:border-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                                                            />
                                                            <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium text-sm text-center sm:text-left px-2">to</span>
                                                            <input 
                                                                type="time" 
                                                                value={rule.end_time} 
                                                                onChange={e => handleRuleChange(rule.originalIndex, 'end_time', e.target.value)} 
                                                                className="flex-1 min-w-0 bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white p-2 text-sm rounded-md border border-slate-400 dark:border-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRemoveTimeSlot(rule.originalIndex)} 
                                                            className="self-center p-2 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors flex-shrink-0"
                                                            title="Remove time slot"
                                                        >
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!selectedSchedule && !isLoading && (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-12 text-center">
                    <Clock size={48} className="mx-auto mb-4 text-slate-400 dark:text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Select a Schedule</h3>
                    <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400">Choose a schedule above to set weekly hours and date overrides.</p>
                </div>
            )}

            {/* Date Overrides Calendar */}
            {selectedSchedule && !isLoading && (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 relative">
                     {isOverridesLoading && (
                        <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-800/50 flex items-center justify-center z-10 rounded-lg">
                            <Loader className="animate-spin text-indigo-500" size={32} />
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Date Overrides</h2>
                            <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 text-sm mt-1">Override specific dates for "{selectedSchedule.name}"</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
                            <button 
                                onClick={calendar.prevMonth} 
                                className="p-2 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="font-semibold text-slate-900 dark:text-white px-4 py-2 min-w-[140px] text-center">
                                {calendar.monthName}
                            </span>
                            <button 
                                onClick={calendar.nextMonth} 
                                className="p-2 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50 rounded-lg p-4">
                        <div className="grid grid-cols-7 text-center text-sm font-semibold text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-3">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="py-2">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendar.daysForMonthView.map((day) => {
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const override = overridesMap.get(dayStr);
                                const isCurrent = isSameMonth(day, calendar.currentDate);
                                const isCurrentDay = isToday(day);
                                
                                return (
                                    <div 
                                        key={day.toString()} 
                                        className={`
                                            relative h-20 sm:h-24 flex flex-col p-2 rounded-md cursor-pointer transition-all
                                            ${isCurrent 
                                                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-500' 
                                                : 'text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                                            }
                                            ${isCurrentDay && isCurrent ? 'ring-1 ring-indigo-400' : ''}
                                        `}
                                        onClick={() => handleDayClick(day)}
                                    >
                                        <span className={`text-sm font-medium ${
                                            isCurrentDay && isCurrent
                                                ? 'bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center' 
                                                : ''
                                        }`}>
                                            {format(day, 'd')}
                                        </span>
                                        
                                        {override && isCurrent && (
                                            <div className="mt-auto text-center text-[10px] sm:text-xs leading-tight">
                                                {override.is_unavailable ? (
                                                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-700 dark:text-red-300 rounded">
                                                        Unavailable
                                                    </span>
                                                ) : (
                                                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono">
                                                        {toLocalTime(override.start_time)} - {toLocalTime(override.end_time)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-300 dark:border-slate-600">
                            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                Custom Available
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                Unavailable
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <InputModal 
                isOpen={isScheduleModalOpen} 
                onClose={() => setIsScheduleModalOpen(false)} 
                onSubmit={handleScheduleModalSubmit} 
                title={editingSchedule ? 'Rename Schedule' : 'Create Schedule'} 
                label="Schedule Name" 
                initialValue={editingSchedule?.name || ''} 
            />
            
            <OverrideModal 
                isOpen={isOverrideModalOpen} 
                onClose={() => setIsOverrideModalOpen(false)} 
                onSave={handleSaveOverride} 
                onDelete={handleDeleteOverride} 
                date={selectedOverrideDate} 
                scheduleId={selectedScheduleId} 
                existingOverride={overridesMap.get(format(selectedOverrideDate || new Date(), 'yyyy-MM-dd'))} 
                toLocalTime={toLocalTime}
            />
        </div>
    );
};

export default Availability;