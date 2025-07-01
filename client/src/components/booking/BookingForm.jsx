import React, { useState } from 'react';
import { X } from 'lucide-react';

const BookingForm = ({ eventType, selectedTime, duration, onConfirmBooking, onCancel }) => {
    const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
    const [guests, setGuests] = useState([]);
    const [guestInput, setGuestInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleGuestKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newGuest = guestInput.trim();
            if (newGuest && !guests.includes(newGuest)) {
                setGuests([...guests, newGuest]);
            }
            setGuestInput('');
        }
    };

    const removeGuest = (guestToRemove) => {
        setGuests(guests.filter(g => g !== guestToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            await onConfirmBooking({ ...formData, guests });
        } catch (err) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-left p-4 bg-slate-900/50 rounded-lg border border-slate-700 animate-fadeIn">
            <div>
                <label className="text-sm font-medium text-slate-300">Username *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full mt-1 bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
            </div>
            <div>
                <label className="text-sm font-medium text-slate-300">Email (optional)</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full mt-1 bg-slate-700 p-2.5 rounded-md border-2 border-slate-600"/>
            </div>
            {/* --- NEW GUESTS FIELD --- */}
            <div>
                <label className="text-sm font-medium text-slate-300">Guests</label>
                <div className="w-full mt-1 bg-slate-700 p-2 rounded-md border-2 border-slate-600 flex flex-wrap items-center gap-2">
                    {guests.map((guest) => (
                        <div key={guest} className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-600 text-sm">
                            <span>{guest}</span>
                            <button type="button" onClick={() => removeGuest(guest)} className="rounded-full hover:bg-black/20">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    <input
                        type="text"
                        value={guestInput}
                        onChange={(e) => setGuestInput(e.target.value)}
                        onKeyDown={handleGuestKeyDown}
                        placeholder="Add username..."
                        className="bg-transparent outline-none p-1 text-sm flex-grow min-w-[100px]"
                    />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Type a username and press Enter to add a guest.</p>
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