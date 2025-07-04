import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const InputModal = ({
    isOpen,
    onClose,
    onSubmit,
    title,
    label,
    initialValue = '',
    submitText = 'Save',
    placeholder = ''
}) => {
    const [value, setValue] = useState(initialValue);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen, initialValue]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!value.trim()) {
            setError('Field cannot be empty.');
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit(value);
            onClose();
        } catch (err) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" 
            onClick={onClose}
        >
            <div 
                className="bg-slate-100 dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-4 md:p-6 transform transition-all scale-100 animate-in fade-in-0 zoom-in-95 duration-200" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 md:p-1 rounded-full hover:bg-slate-200 dark:bg-slate-700 transition-colors active:scale-95"
                    >
                        <X size={20} className="md:w-6 md:h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <label 
                        htmlFor="input-field" 
                        className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2"
                    >
                        {label}
                    </label>
                    <input
                        id="input-field"
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        required
                        autoFocus
                        className="w-full bg-slate-200 dark:bg-slate-700 p-3 md:p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                    />
                    {error && (
                        <p className="text-red-400 text-sm mt-2 animate-in slide-in-from-top-1 duration-200">
                            {error}
                        </p>
                    )}
                    
                    <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="w-full sm:w-auto px-6 py-3 md:py-2.5 bg-slate-300 dark:bg-slate-600 rounded-lg font-semibold hover:bg-slate-400 dark:hover:bg-slate-500 active:bg-slate-400 transition-all active:scale-95 text-slate-900 dark:text-white"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="w-full sm:w-auto px-6 py-3 md:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all active:scale-95 text-white disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </span>
                            ) : submitText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InputModal;