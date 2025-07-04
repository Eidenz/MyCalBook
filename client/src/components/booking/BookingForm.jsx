import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const BookingForm = ({ eventType, selectedTime, selectedDate, duration, onConfirmBooking, onCancel, loggedInUsername }) => {
    const [formData, setFormData] = useState({ 
        name: loggedInUsername || '', 
        email: '', 
        notes: '' 
    });
    const [guests, setGuests] = useState([]);
    const [guestInput, setGuestInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (loggedInUsername) {
            setFormData(prev => ({ ...prev, name: loggedInUsername }));
        }
    }, [loggedInUsername]);


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
        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-left p-4 bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-700 animate-fadeIn">
            <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Username *</label>
                <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required
                    readOnly={!!loggedInUsername}
                    className="w-full mt-1 bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors read-only:bg-slate-100 dark:bg-slate-800 read-only:cursor-not-allowed"
                />
            </div>
            <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Email <em className="text-xs">(optional)</em></label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full mt-1 bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
            </div>
            <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Guests <em className="text-xs">(optional)</em></label>
                <div className="w-full mt-1 bg-slate-200 dark:bg-slate-700 p-2 rounded-md border-2 border-slate-300 dark:border-slate-600 flex flex-wrap items-center gap-2">
                    {guests.map((guest) => (
                        <div key={guest} className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-300 dark:bg-slate-600 text-sm">
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
                <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1.5">Type a username and press Enter to add a guest.</p>
            </div>
             <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Additional Notes <em className="text-xs">(optional)</em></label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" className="w-full mt-1 bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex items-center gap-3 pt-2">
                <button 
                    type="button" 
                    onClick={onCancel}
                    className="w-full py-3 bg-slate-300 dark:bg-slate-600 rounded-lg font-semibold text-slate-900 dark:text-white hover:bg-slate-400 dark:hover:bg-slate-500 transition"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-slate-900 dark:text-white hover:opacity-90 transition disabled:opacity-50"
                >
                    {isSubmitting ? 'Confirming...' : 'Confirm'}
                </button>
            </div>
        </form>
    );
};

export default BookingForm;