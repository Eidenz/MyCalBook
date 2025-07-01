import React, { useState, useEffect } from 'react';
import { X, User, Mail, Users, FileText } from 'lucide-react';
import ConfirmationModal from '../common/ConfirmationModal';
import { format } from 'date-fns';

const EventModal = ({ isOpen, onClose, onEventCreated, onEventUpdated, onEventDeleted, selectedEvent, token }) => {
    const isEditMode = Boolean(selectedEvent);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // Differentiate between a manual event and a third-party booking
    const isBookedEvent = isEditMode && selectedEvent.type === 'booked';

    const getInitialState = () => {
        if (isEditMode && !isBookedEvent) {
            const startDate = new Date(selectedEvent.start_time);
            const endDate = new Date(selectedEvent.end_time);
            return {
                title: selectedEvent.title || '',
                type: selectedEvent.type || 'personal',
                description: selectedEvent.description || '',
                date: startDate.toISOString().split('T')[0],
                startTime: startDate.toTimeString().substring(0, 5),
                endDate: endDate.toISOString().split('T')[0],
                endTime: endDate.toTimeString().substring(0, 5),
                guests: selectedEvent.guests ? JSON.parse(selectedEvent.guests) : [],
            };
        }
        const today = new Date().toISOString().split('T')[0];
        return {
            title: '', type: 'personal', description: '',
            date: today, startTime: '10:00',
            endDate: today, endTime: '11:00',
            guests: [],
        };
    };
    
    const [formData, setFormData] = useState(getInitialState());
    const [guestInput, setGuestInput] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormData(getInitialState());
        setError('');
        setGuestInput('');
    }, [isOpen, selectedEvent]);

    const handleGuestKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newGuest = guestInput.trim();
            if (newGuest && !formData.guests.includes(newGuest)) {
                setFormData(prev => ({...prev, guests: [...prev.guests, newGuest]}));
            }
            setGuestInput('');
        }
    };

    const removeGuest = (guestToRemove) => {
        setFormData(prev => ({
            ...prev,
            guests: prev.guests.filter(g => g !== guestToRemove)
        }));
    };

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const startDateTimeUTC = new Date(`${formData.date}T${formData.startTime}`).toISOString();
        const endDateTimeUTC = new Date(`${formData.endDate}T${formData.endTime}`).toISOString();

        const payload = {
            title: formData.title, type: formData.type, description: formData.description,
            start_time: startDateTimeUTC, end_time: endDateTimeUTC,
            guests: formData.guests,
        };

        const url = isEditMode ? `/api/events/manual/${selectedEvent.id}` : '/api/events/manual';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `Failed to ${isEditMode ? 'update' : 'create'} event.`);
            }

            const resultEvent = await response.json();
            if (isEditMode) { onEventUpdated(resultEvent); } else { onEventCreated(resultEvent); }
            onClose(); 

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async () => {
        if (!isEditMode || isBookedEvent) return;
        setIsSubmitting(true);
        setError('');
        try {
            await fetch(`/api/events/manual/${selectedEvent.id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
            onEventDeleted(selectedEvent.id);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleCancelBooking = async () => {
        if (!isBookedEvent) return;
        setIsSubmitting(true);
        setError('');
        try {
            const res = await fetch(`/api/events/bookings/${selectedEvent.id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to cancel booking.');
            }
            onEventDeleted(selectedEvent.id);
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
                    <h2 className="text-xl font-bold">
                        {isBookedEvent ? 'Booking Details' : (isEditMode ? 'Edit Event' : 'Add New Event')}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><X size={24} /></button>
                </div>

                {isBookedEvent ? (
                    // --- BOOKED EVENT VIEW ---
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white -mb-2">{selectedEvent.title}</h3>
                        <p className="text-slate-400">
                            {format(new Date(selectedEvent.start_time), 'EEEE, MMMM d, yyyy')} from {format(new Date(selectedEvent.start_time), 'HH:mm')} to {format(new Date(selectedEvent.end_time), 'HH:mm')}
                        </p>
                        <div className="space-y-3 pt-2">
                             <div className="flex items-center gap-3"><User className="text-slate-400" size={18}/><span>{selectedEvent.booker_name}</span></div>
                             <div className="flex items-center gap-3"><Mail className="text-slate-400" size={18}/><span>{selectedEvent.booker_email || 'No email provided'}</span></div>
                             {selectedEvent.guests && JSON.parse(selectedEvent.guests).length > 0 &&
                                <div className="flex items-start gap-3">
                                    <Users className="text-slate-400 mt-0.5" size={18}/>
                                    <span>{JSON.parse(selectedEvent.guests).join(', ')}</span>
                                </div>
                             }
                             {selectedEvent.description && 
                                <div className="flex items-start gap-3">
                                    <FileText className="text-slate-400 mt-0.5" size={18}/>
                                    <p className="whitespace-pre-wrap">{selectedEvent.description}</p>
                                </div>
                             }
                        </div>
                        {error && <div className="text-red-400 text-sm bg-red-900/50 p-3 rounded-lg">{error}</div>}
                        <div className="mt-6 flex justify-between items-center">
                            <button type="button" onClick={() => setIsConfirmModalOpen(true)} disabled={isSubmitting} className="px-6 py-2.5 bg-red-800 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50">Cancel Booking</button>
                            <button type="button" onClick={onClose} className="px-6 py-2.5 bg-slate-600 rounded-lg font-semibold hover:bg-slate-500 transition">Close</button>
                        </div>
                    </div>
                ) : (
                    // --- MANUAL EVENT FORM (CREATE/EDIT) ---
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition" placeholder="Event Title *"/>
                        <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition">
                            <option value="personal">Personal Event</option>
                            <option value="blocked">Blocked Time</option>
                        </select>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="date" name="date" value={formData.date} onChange={handleChange} required className="bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition" />
                            <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className="bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition" />
                            <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required className="bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition" />
                            <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required className="bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition" />
                        </div>
                        <div>
                            <div className="w-full bg-slate-700 p-2 rounded-lg border-2 border-slate-600 flex flex-wrap items-center gap-2">
                                {formData.guests.map((guest) => (
                                    <div key={guest} className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-600 text-sm">
                                        <span>{guest}</span>
                                        <button type="button" onClick={() => removeGuest(guest)} className="rounded-full hover:bg-black/20"><X size={14} /></button>
                                    </div>
                                ))}
                                <input type="text" value={guestInput} onChange={(e) => setGuestInput(e.target.value)} onKeyDown={handleGuestKeyDown} placeholder="Add guests..." className="bg-transparent outline-none p-1 text-sm flex-grow min-w-[100px]" />
                            </div>
                        </div>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition" placeholder="Add notes or details..."/>
                        {error && <div className="text-red-400 text-sm bg-red-900/50 p-3 rounded-lg">{error}</div>}

                        <div className="mt-6 flex justify-between items-center">
                            {isEditMode && <button type="button" onClick={() => setIsConfirmModalOpen(true)} disabled={isSubmitting} className="px-6 py-2.5 bg-red-800 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50">Delete</button>}
                            <div className="flex-grow flex justify-end gap-3">
                                <button type="button" onClick={onClose} className="px-6 py-2.5 bg-slate-600 rounded-lg font-semibold hover:bg-slate-500 transition">Close</button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
                                    {isSubmitting ? '...' : (isEditMode ? 'Save Changes' : 'Create Event')}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
            <ConfirmationModal 
                isOpen={isConfirmModalOpen} 
                onClose={() => setIsConfirmModalOpen(false)} 
                onConfirm={isBookedEvent ? handleCancelBooking : handleDelete} 
                title={isBookedEvent ? "Cancel Booking" : "Delete Event"}
                message={isBookedEvent 
                    ? `Are you sure you want to cancel this booking with "${selectedEvent?.booker_name}"? They will be notified by email.`
                    : `Are you sure you want to permanently delete "${selectedEvent?.title}"?`
                } 
            />
        </div>
    );
};

export default EventModal;