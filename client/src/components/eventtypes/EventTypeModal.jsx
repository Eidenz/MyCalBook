import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const EventTypeModal = ({ isOpen, onClose, onSave, token, schedules, eventType }) => {
    const isEditMode = Boolean(eventType);
    
    const [durationInput, setDurationInput] = useState('');

    const getInitialState = () => {
        if (isEditMode) {
            const durations = (typeof eventType.durations === 'string') 
                ? JSON.parse(eventType.durations) 
                : (eventType.durations || [30]);
            return {
                title: eventType.title || '',
                location: eventType.location || 'VRChat',
                schedule_id: eventType.schedule_id || (schedules[0]?.id || ''),
                description: eventType.description || '',
                durations: durations,
                default_duration: eventType.default_duration || durations[0] || 30,
                is_public: eventType.is_public !== undefined ? eventType.is_public : true,
            };
        }
        return {
            title: '', location: 'VRChat', schedule_id: schedules[0]?.id || '',
            description: '', durations: [30, 60], default_duration: 60, is_public: true
        };
    };

    const [formData, setFormData] = useState(getInitialState());
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialState());
            setError('');
            setDurationInput('');
        }
    }, [isOpen, eventType, schedules]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleDurationKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newDuration = parseInt(durationInput.trim(), 10);
            if (!isNaN(newDuration) && newDuration > 0 && !formData.durations.includes(newDuration)) {
                setFormData(prev => ({ ...prev, durations: [...prev.durations, newDuration] }));
            }
            setDurationInput('');
        }
    };

    const removeDuration = (durationToRemove) => {
        const newDurations = formData.durations.filter(d => d !== durationToRemove);
        if (String(formData.default_duration) === String(durationToRemove)) {
            setFormData(prev => ({...prev, durations: newDurations, default_duration: newDurations[0] || '' }));
        } else {
            setFormData(prev => ({ ...prev, durations: newDurations }));
        }
    };

    const setDefaultDuration = (duration) => {
        setFormData(prev => ({ ...prev, default_duration: duration }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setError('');
        setIsSubmitting(true);
        
        const url = isEditMode ? `/api/event-types/${eventType.id}` : '/api/event-types';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `Failed to ${isEditMode ? 'update' : 'create'} event type.`);
            }

            const savedEventType = await response.json();
            onSave(savedEventType);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4 transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{isEditMode ? 'Edit Event Type' : 'New Event Type'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Public Toggle */}
                    <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg">
                        <div>
                            <h3 className="font-semibold text-white">Public Event</h3>
                            <p className="text-sm text-slate-400">Visible on your public booking page.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="is_public" checked={formData.is_public} onChange={handleChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {/* Other fields */}
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="Title" className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} required placeholder="Location" className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Description..." className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
                    
                    {/* Durations */}
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-slate-300">Durations (minutes)</label>
                        <div className="p-2 bg-slate-700 border-2 border-slate-600 rounded-md flex flex-wrap items-center gap-2">
                            {formData.durations.map((duration) => (
                                <div key={duration} onClick={() => setDefaultDuration(duration)} className={`flex items-center gap-2 px-2.5 py-1 rounded-full cursor-pointer ${ String(formData.default_duration) === String(duration) ? 'bg-indigo-600' : 'bg-slate-600' }`}>
                                    <span>{duration} min</span>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); removeDuration(duration); }} className="rounded-full hover:bg-black/20"><X size={14} /></button>
                                </div>
                            ))}
                            <input type="text" value={durationInput} onChange={(e) => setDurationInput(e.target.value.replace(/\D/g, ''))} onKeyDown={handleDurationKeyDown} placeholder="Add" className="bg-transparent outline-none p-1 text-sm w-16"/>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">Click a tag to set as default.</p>
                    </div>

                    <select name="schedule_id" value={formData.schedule_id} onChange={handleChange} required className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600">
                        {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    {error && <div className="text-red-400 text-sm bg-red-900/50 p-3 rounded-lg">{error}</div>}

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 bg-slate-600 rounded-lg font-semibold hover:bg-slate-500">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50">
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventTypeModal;