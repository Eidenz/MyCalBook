import React, { useState, useEffect } from 'react';
import { X, User, Mail, Users, FileText, Repeat } from 'lucide-react';
import ConfirmationModal from '../common/ConfirmationModal';
import { format, formatISO, parseISO } from 'date-fns';
import RecurrenceEditModal from './RecurrenceEditModal';

const weekDays = [
    { name: 'Sun', value: 'SU' }, { name: 'Mon', value: 'MO' },
    { name: 'Tue', value: 'TU' }, { name: 'Wed', value: 'WE' },
    { name: 'Thu', value: 'TH' }, { name: 'Fri', value: 'FR' },
    { name: 'Sat', value: 'SA' }
];

const EventModal = ({ isOpen, onClose, selectedEvent, token }) => {
    const isEditMode = Boolean(selectedEvent && selectedEvent.id);
    const isBookedEvent = isEditMode && selectedEvent.type === 'booked';
    const isRecurring = Boolean(selectedEvent?.recurrence_id);

    // Modal states
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
    const [recurrenceAction, setRecurrenceAction] = useState({ action: null, scope: null });

    const getInitialState = () => {
        const eventDate = new Date(selectedEvent?.start_time || Date.now());
        const defaultStartDate = format(eventDate, 'yyyy-MM-dd');
        const defaultStartTime = format(eventDate, 'HH:mm');
        const defaultEndTime = format(new Date(eventDate.getTime() + 60 * 60 * 1000), 'HH:mm');
        
        return {
            title: selectedEvent?.title || '', type: selectedEvent?.type || 'personal',
            description: selectedEvent?.description || '',
            date: defaultStartDate, startTime: defaultStartTime,
            endDate: selectedEvent?.end_time ? format(new Date(selectedEvent.end_time), 'yyyy-MM-dd') : defaultStartDate,
            endTime: selectedEvent?.end_time ? format(new Date(selectedEvent.end_time), 'HH:mm') : defaultEndTime,
            guests: (selectedEvent?.guests && JSON.parse(selectedEvent.guests)) || [],
            recurrence: {
                frequency: '', interval: 1,
                by_day: [], end_date: '',
            }
        };
    };
    
    const [formData, setFormData] = useState(getInitialState());
    const [guestInput, setGuestInput] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if(isOpen) {
            setFormData(getInitialState());
            setError('');
            setGuestInput('');
        }
    }, [isOpen, selectedEvent]);

    const handleGuestKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newGuest = guestInput.trim();
            if (newGuest && !formData.guests.includes(newGuest)) {
                setFormData(p => ({...p, guests: [...p.guests, newGuest]}));
            }
            setGuestInput('');
        }
    };

    const removeGuest = (g) => setFormData(p => ({ ...p, guests: p.guests.filter(guest => guest !== g) }));
    const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleRecurrenceChange = (e) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, recurrence: { ...p.recurrence, [name]: value }}));
    };
    const handleDayToggle = (day) => {
        const by_day = formData.recurrence.by_day;
        const newDays = by_day.includes(day) ? by_day.filter(d => d !== day) : [...by_day, day];
        setFormData(p => ({...p, recurrence: {...p.recurrence, by_day: newDays}}));
    };

    const performSave = async (scope) => {
        setError('');
        setIsSubmitting(true);
    
        const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
        const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    
        const payload = {
            title: formData.title, type: formData.type, description: formData.description,
            start_time: startDateTime.toISOString(), end_time: endDateTime.toISOString(),
            guests: formData.guests,
            recurrence: formData.recurrence.frequency ? {
                frequency: formData.recurrence.frequency.toUpperCase(),
                interval: formData.recurrence.interval,
                by_day: formData.recurrence.by_day.join(','),
                end_date: formData.recurrence.end_date ? new Date(formData.recurrence.end_date).toISOString() : null
            } : null,
        };
        
        if (isRecurring && scope === 'single') {
            payload.updateScope = 'single';
            payload.original_start_time = new Date(selectedEvent.start_time).toISOString();
        } else if (isRecurring) {
            payload.updateScope = 'all';
        }
    
        const url = isEditMode ? `/api/events/manual/${selectedEvent.id}` : '/api/events/manual';
        const method = isEditMode ? 'PUT' : 'POST';
    
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(payload)
            });
    
            if (!response.ok) throw new Error((await response.json()).error);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const performDelete = async (scope) => {
        if (!isEditMode) return;
        setIsSubmitting(true);
        setError('');
    
        const payload = { updateScope: scope };
        if (scope === 'single') {
            payload.original_start_time = new Date(selectedEvent.start_time).toISOString();
        }
    
        try {
            const url = isBookedEvent
              ? `/api/events/bookings/${selectedEvent.id}`
              : `/api/events/manual/${selectedEvent.id}`;
            const response = await fetch(url, { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(payload)
            });
    
            if (!response.ok) throw new Error((await response.json()).error);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isRecurring) {
            setRecurrenceAction({ action: 'save' });
            setIsRecurrenceModalOpen(true);
        } else {
            performSave();
        }
    };

    const handleDeleteClick = () => {
        if (isRecurring) {
            setRecurrenceAction({ action: 'delete' });
            setIsRecurrenceModalOpen(true);
        } else {
            setIsConfirmDeleteOpen(true);
        }
    };

    const handleRecurrenceConfirm = (scope) => {
        if (recurrenceAction.action === 'save') {
            performSave(scope);
        } else if (recurrenceAction.action === 'delete') {
            performDelete(scope);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4 transform transition-all overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{isBookedEvent ? 'Booking Details' : (isEditMode ? 'Edit Event' : 'Add New Event')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><X size={24} /></button>
                </div>
                {isBookedEvent ? (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white -mb-2">{selectedEvent.title}</h3>
                        <p className="text-slate-400">{format(new Date(selectedEvent.start_time), 'EEEE, MMMM d, yyyy')} from {format(new Date(selectedEvent.start_time), 'HH:mm')} to {format(new Date(selectedEvent.end_time), 'HH:mm')}</p>
                        <div className="space-y-3 pt-2">
                             <div className="flex items-center gap-3"><User size={18}/><span className="truncate">{selectedEvent.booker_name}</span></div>
                             <div className="flex items-center gap-3"><Mail size={18}/><span className="truncate">{selectedEvent.booker_email || 'N/A'}</span></div>
                             {selectedEvent.guests && JSON.parse(selectedEvent.guests).length > 0 && <div className="flex items-start gap-3"><Users size={18}/><span>{JSON.parse(selectedEvent.guests).join(', ')}</span></div>}
                             {selectedEvent.description && <div className="flex items-start gap-3"><FileText size={18}/><p className="whitespace-pre-wrap">{selectedEvent.description}</p></div>}
                        </div>
                        {error && <div className="text-red-400 text-sm bg-red-900/50 p-3 rounded-lg">{error}</div>}
                        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={handleDeleteClick} disabled={isSubmitting} className="px-6 py-2.5 bg-red-800 rounded-lg font-semibold hover:bg-red-700">Cancel Booking</button></div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full bg-slate-700 p-2.5 rounded-md" placeholder="Event Title *"/>
                        <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-700 p-2.5 rounded-md"><option value="personal">Personal Event</option><option value="blocked">Blocked Time</option></select>
                        <div className="grid grid-cols-2 gap-4"><input type="date" name="date" value={formData.date} onChange={handleChange} required className="bg-slate-700 p-2.5 rounded-md" /><input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className="bg-slate-700 p-2.5 rounded-md" /><input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required className="bg-slate-700 p-2.5 rounded-md" /><input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required className="bg-slate-700 p-2.5 rounded-md" /></div>
                        <div className="w-full bg-slate-700 p-2 rounded-md flex flex-wrap items-center gap-2"><div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-600 text-sm">{formData.guests.map(g => <span key={g}>{g}<button type="button" onClick={()=>removeGuest(g)} className="ml-1">x</button></span>)}</div><input type="text" value={guestInput} onChange={(e) => setGuestInput(e.target.value)} onKeyDown={handleGuestKeyDown} placeholder="Add guests..." className="bg-transparent outline-none p-1 text-sm flex-grow min-w-[100px]" /></div>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="2" className="w-full bg-slate-700 p-2.5 rounded-md" placeholder="Notes..."/>

                        {/* Recurrence Section */}
                        <div className="space-y-3 p-3 bg-slate-900/50 rounded-lg">
                            <div className="flex items-center gap-2"><Repeat size={16}/><label className="font-semibold">Repeat</label></div>
                            <select name="frequency" value={formData.recurrence.frequency} onChange={handleRecurrenceChange} className="w-full bg-slate-700 p-2 rounded-md"><option value="">Does not repeat</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select>
                            {formData.recurrence.frequency === 'WEEKLY' && (
                                <div className="flex justify-between gap-1">{weekDays.map(day => <button type="button" key={day.value} onClick={() => handleDayToggle(day.value)} className={`w-9 h-9 rounded-full text-xs font-bold ${formData.recurrence.by_day.includes(day.value) ? 'bg-indigo-600' : 'bg-slate-600'}`}>{day.name}</button>)}</div>
                            )}
                            {formData.recurrence.frequency && (
                                <div className="flex items-center gap-2">
                                    <input type="date" name="end_date" value={formData.recurrence.end_date} onChange={handleRecurrenceChange} className="bg-slate-700 p-2 rounded-md w-full" />
                                </div>
                            )}
                        </div>

                        {error && <div className="text-red-400 text-sm bg-red-900/50 p-3 rounded-lg">{error}</div>}
                        <div className="mt-6 flex justify-between items-center">
                            {isEditMode && <button type="button" onClick={handleDeleteClick} disabled={isSubmitting} className="px-6 py-2.5 bg-red-800 rounded-lg font-semibold hover:bg-red-700">Delete</button>}
                            <div className="flex-grow flex justify-end gap-3"><button type="button" onClick={onClose} className="px-6 py-2.5 bg-slate-600 rounded-lg font-semibold hover:bg-slate-500">Cancel</button><button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700">{isSubmitting ? '...' : 'Save'}</button></div>
                        </div>
                    </form>
                )}
            </div>

            <ConfirmationModal isOpen={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)} onConfirm={() => performDelete('all')} title="Delete Event" message={`Are you sure you want to permanently delete "${selectedEvent?.title}"?`} />
            <RecurrenceEditModal isOpen={isRecurrenceModalOpen} onClose={() => setIsRecurrenceModalOpen(false)} onConfirm={handleRecurrenceConfirm} verb={recurrenceAction.action}/>
        </div>
    );
};

export default EventModal;