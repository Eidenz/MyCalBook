import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';

const OverrideModal = ({ isOpen, onClose, onSave, onDelete, date, scheduleId, existingOverride, toLocalTime }) => {
    const [isUnavailable, setIsUnavailable] = useState(false);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = !!existingOverride;

    useEffect(() => {
        if (isOpen) {
            if (existingOverride) {
                setIsUnavailable(existingOverride.is_unavailable);
                setStartTime(toLocalTime(existingOverride.start_time) || '09:00');
                setEndTime(toLocalTime(existingOverride.end_time) || '17:00');
            } else {
                setIsUnavailable(false);
                setStartTime('09:00');
                setEndTime('17:00');
            }
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen, existingOverride, toLocalTime]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            // Note: The data sent back to the parent contains local time.
            // The parent component is responsible for converting it to UTC.
            await onSave({
                schedule_id: scheduleId,
                date: format(date, 'yyyy-MM-dd'),
                is_unavailable: isUnavailable,
                start_time: isUnavailable ? null : startTime,
                end_time: isUnavailable ? null : endTime,
            });
            onClose();
        } catch (err) {
            setError(err.message || "Failed to save override.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditMode) return;
        setIsSubmitting(true);
        setError('');
        try {
            await onDelete(format(date, 'yyyy-MM-dd'));
            onClose();
        } catch (err) {
            setError(err.message || "Failed to delete override.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4 transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Edit Availability for {format(date, 'MMMM d')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><X size={24} /></button>
                </div>
                
                <div className="space-y-4">
                    <label htmlFor="unavailable-toggle" className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg cursor-pointer transition-colors hover:bg-slate-700">
                        <span className="font-semibold text-white">Mark as unavailable</span>
                        <div className="relative inline-flex items-center">
                            <input type="checkbox" id="unavailable-toggle" checked={isUnavailable} onChange={(e) => setIsUnavailable(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </div>
                    </label>

                    <div className={`transition-opacity duration-300 ${isUnavailable ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <p className="text-sm text-slate-400 mb-2">Or, set specific hours for this day:</p>
                        <div className="flex items-center gap-2">
                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={isUnavailable} className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
                            <span className="text-slate-400 font-mono">-</span>
                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={isUnavailable} className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
                        </div>
                    </div>
                </div>

                {error && <div className="text-red-400 text-sm bg-red-900/50 p-3 rounded-lg mt-4">{error}</div>}

                <div className="mt-6 flex justify-between items-center">
                    <div>
                        {isEditMode && (
                            <button onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition">
                                {isSubmitting ? '...' : 'Remove Override'}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 bg-slate-600 rounded-lg font-semibold hover:bg-slate-500">Cancel</button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50">
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverrideModal;