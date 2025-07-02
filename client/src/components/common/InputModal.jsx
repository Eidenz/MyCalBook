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
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6 mx-4 transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="input-field" className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
                    <input
                        id="input-field"
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        required
                        autoFocus
                        className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition"
                    />
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 bg-slate-600 rounded-lg font-semibold hover:bg-slate-500">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50">
                            {isSubmitting ? 'Saving...' : submitText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InputModal;