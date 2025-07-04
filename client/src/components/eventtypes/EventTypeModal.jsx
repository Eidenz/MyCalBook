import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, Trash2, Loader } from 'lucide-react';

const EventTypeModal = ({ isOpen, onClose, onSave, token, eventType }) => {
    const isEditMode = Boolean(eventType);
    const fileInputRef = useRef(null);

    const getInitialState = () => ({
        title: '',
        location: 'VRChat',
        schedule_id: '',
        description: '',
        durations: [30, 60],
        default_duration: 60,
        is_public: true,
        image_url: '',
    });
    
    const [formData, setFormData] = useState(getInitialState());
    const [schedules, setSchedules] = useState([]);
    const [durationInput, setDurationInput] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const loadData = async () => {
                setIsSubmitting(false);
                setError('');
                setDurationInput('');
                try {
                    const res = await fetch('/api/availability/schedules', { headers: { 'x-auth-token': token } });
                    if (!res.ok) throw new Error('Could not load schedules.');
                    const fetchedSchedules = await res.json();
                    setSchedules(fetchedSchedules);

                    if (isEditMode) {
                        const durations = (typeof eventType.durations === 'string') 
                            ? JSON.parse(eventType.durations) 
                            : (eventType.durations || []);
                        setFormData({
                            title: eventType.title || '',
                            location: eventType.location || '',
                            schedule_id: eventType.schedule_id || (fetchedSchedules[0]?.id || ''),
                            description: eventType.description || '',
                            durations: durations,
                            default_duration: eventType.default_duration || durations[0] || '',
                            is_public: eventType.is_public !== undefined ? eventType.is_public : true,
                            image_url: eventType.image_url || '',
                        });
                    } else {
                        const initialState = getInitialState();
                        if (fetchedSchedules.length > 0) {
                            initialState.schedule_id = fetchedSchedules[0].id;
                        }
                        setFormData(initialState);
                    }
                } catch (err) {
                    setError(err.message);
                }
            };
            loadData();
        }
    }, [isOpen, eventType, token]);


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
                const newDurations = [...formData.durations, newDuration].sort((a,b) => a-b);
                setFormData(prev => ({ ...prev, durations: newDurations }));
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
    
    const handleImageUpload = async (file) => {
        if (!file) return;
        setIsUploading(true);
        setError('');

        const uploadFormData = new FormData();
        uploadFormData.append('image', file);

        try {
            const res = await fetch('/api/upload/image', {
                method: 'POST',
                headers: { 'x-auth-token': token },
                body: uploadFormData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            
            setFormData(prev => ({ ...prev, image_url: data.imageUrl }));
        } catch (err) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };
    
    const removeImage = () => {
        setFormData(prev => ({ ...prev, image_url: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        if (schedules.length === 0) {
            setError("You must create an availability schedule first.");
            return;
        }
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
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4 transform transition-all overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{isEditMode ? 'Edit Booking Type' : 'New Booking Type'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:bg-slate-700"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="file" ref={fileInputRef} onChange={(e) => handleImageUpload(e.target.files[0])} accept="image/*" className="hidden" />
                    
                    {formData.image_url ? (
                        <div className="relative group">
                            <img src={formData.image_url} alt="Event Preview" className="w-full h-48 object-cover rounded-lg bg-slate-200 dark:bg-slate-700" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                                <button type="button" onClick={removeImage} className="p-2 bg-red-600 rounded-full text-slate-900 dark:text-white hover:bg-red-700">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div 
                            onClick={() => fileInputRef.current.click()}
                            className="w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-600 dark:text-indigo-400 cursor-pointer transition-colors"
                        >
                            {isUploading ? (
                                <>
                                    <Loader className="animate-spin h-8 w-8 mb-2" />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <UploadCloud size={32} />
                                    <span className="mt-2 text-sm font-semibold">Upload an image</span>
                                    <span className="text-xs">PNG, JPG, WEBP, GIF up to 40MB</span>
                                </>
                            )}
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50 p-3 rounded-lg">
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">Public Booking</h3>
                            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">Visible on your public booking page.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="is_public" checked={formData.is_public} onChange={handleChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="Title" className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} required placeholder="Location" className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Description..." className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                    
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">Durations (minutes)</label>
                        <div className="p-2 bg-slate-200 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-md flex flex-wrap items-center gap-2">
                            {formData.durations.map((duration) => (
                                <div key={duration} onClick={() => setDefaultDuration(duration)} className={`flex items-center gap-2 px-2.5 py-1 rounded-full cursor-pointer ${ String(formData.default_duration) === String(duration) ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600' }`}>
                                    <span>{duration} min</span>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); removeDuration(duration); }} className="rounded-full hover:bg-black/20"><X size={14} /></button>
                                </div>
                            ))}
                            <input type="text" value={durationInput} onChange={(e) => setDurationInput(e.target.value.replace(/\D/g, ''))} onKeyDown={handleDurationKeyDown} placeholder="Add" className="bg-transparent outline-none p-1 text-sm w-16"/>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1.5">Click a tag to set as default. Press Enter to add.</p>
                    </div>
                    
                    <div>
                        <label htmlFor="schedule_id" className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">Availability Schedule</label>
                        <select name="schedule_id" id="schedule_id" value={formData.schedule_id} onChange={handleChange} required className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600">
                           {schedules.length === 0 && <option value="" disabled>No schedules available</option>}
                           {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    {error && <div className="text-red-400 text-sm bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</div>}

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 bg-slate-300 dark:bg-slate-600 rounded-lg font-semibold hover:bg-slate-400 dark:hover:bg-slate-500">Cancel</button>
                        <button type="submit" disabled={isSubmitting || isUploading} className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50">
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventTypeModal;