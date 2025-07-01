import React, { useState } from 'react';

const BookingForm = ({ eventType, selectedTime, duration, onConfirmBooking, onCancel }) => {
    const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            await onConfirmBooking(formData);
        } catch (err) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700 animate-fadeIn">
            <div>
                <label className="text-sm font-medium text-slate-300">Username *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full mt-1 bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
            </div>
            <div>
                <label className="text-sm font-medium text-slate-300">Email (optional)</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full mt-1 bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
            </div>
             <div>
                <label className="text-sm font-medium text-slate-300">Additional Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" className="w-full mt-1 bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex items-center gap-3 pt-2">
                <button 
                    type="button" 
                    onClick={onCancel}
                    className="w-full py-3 bg-slate-600 rounded-lg font-semibold text-white hover:bg-slate-500 transition"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                >
                    {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
                </button>
            </div>
        </form>
    );
};

export default BookingForm;