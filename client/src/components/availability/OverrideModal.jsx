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
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={onClose}>
            <div className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md p-4 sm:p-6 transform transition-all animate-in fade-in-0 zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header - Mobile optimized */}
                <div className="flex justify-between items-start gap-3 mb-4 sm:mb-6">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold leading-tight">
                            <span className="block sm:inline">Edit Availability</span>
                            <span className="block sm:inline sm:ml-1 text-slate-300">
                                {format(date, 'MMM d')}
                            </span>
                        </h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="space-y-4 sm:space-y-5">
                    {/* Unavailable Toggle */}
                    <label 
                        htmlFor="unavailable-toggle" 
                        className="flex items-center justify-between bg-slate-700/50 p-3 sm:p-4 rounded-lg cursor-pointer transition-colors hover:bg-slate-700"
                    >
                        <span className="font-semibold text-white text-sm sm:text-base">Mark as unavailable</span>
                        <div className="relative inline-flex items-center">
                            <input 
                                type="checkbox" 
                                id="unavailable-toggle" 
                                checked={isUnavailable} 
                                onChange={(e) => setIsUnavailable(e.target.checked)} 
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </div>
                    </label>

                    {/* Time Selection */}
                    <div className={`transition-all duration-300 ${isUnavailable ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <p className="text-xs sm:text-sm text-slate-400 mb-3">Or, set specific hours for this day:</p>
                        
                        {/* Mobile-optimized time inputs */}
                        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
                            <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1 sm:sr-only">Start time</label>
                                <input 
                                    type="time" 
                                    value={startTime} 
                                    onChange={e => setStartTime(e.target.value)} 
                                    disabled={isUnavailable} 
                                    className="w-full bg-slate-700 p-2.5 sm:p-3 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors text-sm sm:text-base"
                                />
                            </div>
                            
                            <div className="flex items-center justify-center sm:block">
                                <span className="text-slate-400 font-mono text-sm sm:text-base px-2">to</span>
                            </div>
                            
                            <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1 sm:sr-only">End time</label>
                                <input 
                                    type="time" 
                                    value={endTime} 
                                    onChange={e => setEndTime(e.target.value)} 
                                    disabled={isUnavailable} 
                                    className="w-full bg-slate-700 p-2.5 sm:p-3 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors text-sm sm:text-base"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="text-red-400 text-xs sm:text-sm bg-red-900/50 p-3 rounded-lg mt-4 animate-in fade-in-0 duration-200">
                        {error}
                    </div>
                )}

                {/* Actions - Mobile optimized */}
                <div className="mt-6 space-y-3 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
                    {/* Delete button */}
                    <div className="flex justify-center sm:justify-start">
                        {isEditMode && (
                            <button 
                                onClick={handleDelete} 
                                disabled={isSubmitting} 
                                className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? '...' : 'Remove Override'}
                            </button>
                        )}
                    </div>
                    
                    {/* Main action buttons */}
                    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2">
                        <button 
                            onClick={onClose} 
                            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-slate-600 rounded-lg font-semibold hover:bg-slate-500 transition-colors text-sm sm:text-base"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSubmitting} 
                            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all text-sm sm:text-base"
                        >
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverrideModal;