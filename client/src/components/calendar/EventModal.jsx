import React, { useState, useEffect } from 'react';
import { X, User, Mail, Users, FileText, Repeat, Download } from 'lucide-react';
import ConfirmationModal from '../common/ConfirmationModal';
import { format, formatISO, parseISO } from 'date-fns';
import RecurrenceEditModal from './RecurrenceEditModal';

const weekDays = [
    { name: 'Sun', value: 'SU' }, { name: 'Mon', value: 'MO' },
    { name: 'Tue', value: 'TU' }, { name: 'Wed', value: 'WE' },
    { name: 'Thu', value: 'TH' }, { name: 'Fri', value: 'FR' },
    { name: 'Sat', value: 'SA' }
];

const EventModal = ({ isOpen, onClose, selectedEvent, token, onRefresh }) => {
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

    // Parse description for a booking management link
    const { bookingManagementLink, cleanDescription } = React.useMemo(() => {
        if (isBookedEvent && selectedEvent?.description) {
            const linkRegex = /(https?:\/\/[^\s]+)/;
            const match = selectedEvent.description.match(linkRegex);
            if (match && match[0].includes('/cancel/')) {
                return {
                    bookingManagementLink: match[0],
                    cleanDescription: selectedEvent.description.replace(/Manage this booking:[\s\S]*/, '').trim()
                };
            }
        }
        return { bookingManagementLink: null, cleanDescription: selectedEvent?.description };
    }, [isBookedEvent, selectedEvent]);

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
            
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(url, { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
    
            if (!response.ok) {
                // Try to get error message from response
                let errorMessage = 'Failed to delete event';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    // If response isn't JSON, use default message
                }
                throw new Error(errorMessage);
            }
            
            // Successfully deleted, close modal
            onClose();
        } catch (err) {
            console.error('Delete error:', err);
            if (err.name === 'AbortError') {
                setError('Request timed out. The booking may still have been cancelled.');
            } else {
                setError(err.message);
            }
            
            // For booking cancellations, close the modal after showing error
            if (isBookedEvent) {
                setTimeout(() => {
                    onClose();
                }, 2000); // Close after 2 seconds to let user see the error
            }
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

    const handleDeleteConfirm = async () => {
        setIsConfirmDeleteOpen(false); // Close confirmation modal first
        
        // For booked events, close the main modal immediately and perform delete in background
        if (isBookedEvent) {
            onClose(); // Close the main modal right away
            performDeleteInBackground('all');
        } else {
            await performDelete('all');
        }
    };

    const performDeleteInBackground = async (scope) => {
        const payload = { updateScope: scope };
        if (scope === 'single') {
            payload.original_start_time = new Date(selectedEvent.start_time).toISOString();
        }

        try {
            const url = `/api/events/bookings/${selectedEvent.id}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            await fetch(url, { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Trigger calendar refresh after successful deletion
            if (onRefresh) {
                setTimeout(() => {
                    onRefresh();
                }, 500);
            }
            
        } catch (err) {
            console.error('Background delete error:', err);
            // Even if deletion fails, still try to refresh the calendar
            // in case it actually succeeded but just had a network issue
            if (onRefresh) {
                setTimeout(() => {
                    onRefresh();
                }, 500);
            }
        }
    };

    const formatUtcDateTime = (date) => {
        return new Date(date).toISOString().replace(/-|:|\.\d+/g, '');
    };

    const handleDownloadIcs = () => {
        if (!selectedEvent) return;
        const { id, title, start_time, end_time, location } = selectedEvent;
        const finalDescription = (isBookedEvent ? cleanDescription : formData.description || '').replace(/\n/g, '\\n');

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//MyCalBook//App v1.0//EN',
            'BEGIN:VEVENT',
            `UID:${id}@mycalbook.com`,
            `DTSTAMP:${formatUtcDateTime(new Date())}`,
            `DTSTART:${formatUtcDateTime(start_time)}`,
            `DTEND:${formatUtcDateTime(end_time)}`,
            `SUMMARY:${title}`,
            `DESCRIPTION:${finalDescription}`,
            `LOCATION:${location || ''}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${title.replace(/ /g, '_')}.ics`);
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4 transform transition-all overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{isBookedEvent ? 'Booking Details' : (isEditMode ? 'Edit Event' : 'Add New Event')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                {isBookedEvent ? (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white -mb-2">{selectedEvent.title}</h3>
                        <p className="text-slate-400">{format(new Date(selectedEvent.start_time), 'EEEE, MMMM d, yyyy')} from {format(new Date(selectedEvent.start_time), 'HH:mm')} to {format(new Date(selectedEvent.end_time), 'HH:mm')}</p>
                        <div className="space-y-3 pt-2">
                            {bookingManagementLink ? (
                            <></>
                            ) : (
                                <div className="flex items-center gap-3"><User size={18}/><span className="truncate">{selectedEvent.booker_name}</span></div>
                            )}
                             <div className="flex items-center gap-3"><Mail size={18}/><span className="truncate">{selectedEvent.booker_email || 'N/A'}</span></div>
                             {selectedEvent.guests && JSON.parse(selectedEvent.guests).length > 0 && <div className="flex items-start gap-3"><Users size={18} className="mt-1"/><span>{JSON.parse(selectedEvent.guests).join(', ')}</span></div>}
                             {cleanDescription && <div className="flex items-start gap-3"><FileText size={18} className="mt-1 flex-shrink-0"/><p className="whitespace-pre-wrap">{cleanDescription}</p></div>}
                        </div>
                        {error && (
                            <div className="text-red-400 text-sm bg-red-900/50 p-3 rounded-lg border border-red-500/30">
                                {error}
                            </div>
                        )}
                        <div className="mt-6 flex justify-between items-center gap-3">
                            <button
                                type="button"
                                onClick={handleDownloadIcs}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm bg-slate-600 rounded-lg font-semibold hover:bg-slate-500 transition-colors"
                            >
                                <Download size={16} />
                                <span>Download .ics</span>
                            </button>
                            <div className="flex justify-end gap-3">
                                {bookingManagementLink ? (
                                    <a href={bookingManagementLink} target="_self" rel="noopener noreferrer" className="px-6 py-2.5 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 text-center transition-colors">
                                        Manage Booking
                                    </a>
                                ) : (
                                    <button 
                                        type="button" 
                                        onClick={handleDeleteClick} 
                                        disabled={isSubmitting} 
                                        className="px-6 py-2.5 bg-red-800 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Cancelling...' : 'Cancel Booking'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="Event Title *"/>
                        <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors">
                            <option value="personal">Personal Event</option>
                            <option value="blocked">Blocked Time</option>
                            <option value="birthday">Birthday</option>
                        </select>
                        
                        {/* Updated mobile-friendly date/time section */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Start</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className="bg-slate-700 p-2.5 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors" />
                                    <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className="bg-slate-700 p-2.5 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">End</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required className="bg-slate-700 p-2.5 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors" />
                                    <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required className="bg-slate-700 p-2.5 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="w-full bg-slate-700 p-2 rounded-md border-2 border-slate-600 focus-within:border-indigo-500 transition-colors flex flex-wrap items-center gap-2">
                            {formData.guests.map(g => (
                                <div key={g} className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-600 text-sm">
                                    <span>{g}</span>
                                    <button type="button" onClick={() => removeGuest(g)} className="rounded-full hover:bg-black/20 transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            <input type="text" value={guestInput} onChange={(e) => setGuestInput(e.target.value)} onKeyDown={handleGuestKeyDown} placeholder="Add guests..." className="bg-transparent outline-none p-1 text-sm flex-grow min-w-[100px] text-white placeholder-slate-400" />
                        </div>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="2" className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="Notes..."/>

                        {/* Recurrence Section */}
                        <div className="space-y-3 p-3 bg-slate-900/50 rounded-lg">
                            <div className="flex items-center gap-2"><Repeat size={16}/><label className="font-semibold">Repeat</label></div>
                            <select name="frequency" value={formData.recurrence.frequency} onChange={handleRecurrenceChange} className="w-full bg-slate-700 p-2 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors">
                                <option value="">Does not repeat</option>
                                <option value="YEARLY">Yearly</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="WEEKLY">Weekly</option>
                            </select>
                            {formData.recurrence.frequency === 'WEEKLY' && (
                                <div className="flex justify-between gap-1">{weekDays.map(day => <button type="button" key={day.value} onClick={() => handleDayToggle(day.value)} className={`w-9 h-9 rounded-full text-xs font-bold transition-colors ${formData.recurrence.by_day.includes(day.value) ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}>{day.name}</button>)}</div>
                            )}
                            {formData.recurrence.frequency && (
                                <div className="flex items-center gap-2">
                                    <input type="date" name="end_date" value={formData.recurrence.end_date} onChange={handleRecurrenceChange} className="bg-slate-700 p-2 rounded-md w-full border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors" />
                                </div>
                            )}
                        </div>

                        {error && <div className="text-red-400 text-sm bg-red-900/50 p-3 rounded-lg border border-red-500/30">{error}</div>}
                        
                        <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                            <div className="flex gap-3 w-full sm:w-auto order-2 sm:order-1">
                                {isEditMode && (
                                    <>
                                        <button type="button" onClick={handleDeleteClick} disabled={isSubmitting} className="flex-1 px-6 py-2.5 bg-red-800 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                                            Delete
                                        </button>
                                        <button type="button" onClick={handleDownloadIcs} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-slate-600 rounded-lg font-semibold hover:bg-slate-500 transition-colors">
                                            <Download size={16} /> .ics
                                        </button>
                                    </>
                                )}
                            </div>
                            
                            <div className="flex gap-3 order-1 sm:order-2">
                                <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-600 rounded-lg font-semibold hover:bg-slate-500 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSubmitting ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Saving...</span>
                                        </div>
                                    ) : (
                                        'Save'
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            <ConfirmationModal 
                isOpen={isConfirmDeleteOpen} 
                onClose={() => setIsConfirmDeleteOpen(false)} 
                onConfirm={handleDeleteConfirm} 
                title="Delete Event" 
                message={`Are you sure you want to permanently delete "${selectedEvent?.title}"?`} 
            />
            <RecurrenceEditModal isOpen={isRecurrenceModalOpen} onClose={() => setIsRecurrenceModalOpen(false)} onConfirm={handleRecurrenceConfirm} verb={recurrenceAction.action}/>
        </div>
    );
};

export default EventModal;