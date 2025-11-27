// src/components/calendar/EventModal.jsx

import React, { useState, useEffect } from 'react';
import { X, User, Mail, Users, FileText, Repeat, Download, Link as LinkIcon, Edit, Clock } from 'lucide-react';
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

    // View management state for the modal
    const [view, setView] = useState('details'); // 'details' or 'form'

    // Modal states
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
    const [recurrenceAction, setRecurrenceAction] = useState({ action: null, scope: null });
    const [hasManualEndDate, setHasManualEndDate] = useState(false);

    const getInitialState = () => {
        const eventDate = new Date(selectedEvent?.start_time || Date.now());
        const defaultStartDate = format(eventDate, 'yyyy-MM-dd');
        const defaultStartTime = format(eventDate, 'HH:mm');
        const defaultEndTime = format(new Date(eventDate.getTime() + 60 * 60 * 1000), 'HH:mm');
        const hasEndTime = selectedEvent?.end_time !== null && selectedEvent?.end_time !== undefined;

        return {
            title: selectedEvent?.title || '', type: selectedEvent?.type || 'personal',
            description: selectedEvent?.description || '',
            is_all_day: selectedEvent?.is_all_day || false,
            no_end_time: !hasEndTime && !selectedEvent?.is_all_day,
            date: defaultStartDate, startTime: defaultStartTime,
            endDate: hasEndTime ? format(new Date(selectedEvent.end_time), 'yyyy-MM-dd') : defaultStartDate,
            endTime: hasEndTime ? format(new Date(selectedEvent.end_time), 'HH:mm') : defaultEndTime,
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
            setHasManualEndDate(false);
            setIsConfirmDeleteOpen(false);
            setIsRecurrenceModalOpen(false);
            // When opening, always start in details view if it's an existing event
            setView(isEditMode ? 'details' : 'form');
        }
    }, [isOpen, selectedEvent]);

    const handleAllDayToggle = (e) => {
        const isChecked = e.target.checked;
        setFormData(p => ({
            ...p,
            is_all_day: isChecked,
            no_end_time: false, // Reset no_end_time when toggling all-day
            endDate: isChecked ? p.date : p.endDate
        }));

        // Reset manual tracking when toggling all-day since we're auto-syncing
        if (isChecked) {
            setHasManualEndDate(false);
        }
    };

    const handleNoEndTimeToggle = (e) => {
        const isChecked = e.target.checked;
        setFormData(p => ({
            ...p,
            no_end_time: isChecked
        }));
    };

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
        return { bookingManagementLink: null, cleanDescription: selectedEvent?.description || '' };
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
    const handleChange = (e) => {
        const { name, value } = e.target;
        
        setFormData(p => {
            const newData = { ...p, [name]: value };
            
            // Auto-sync end date when start date changes, but only if user hasn't manually set a different end date
            if (name === 'date' && !hasManualEndDate) {
                newData.endDate = value;
            }
            
            return newData;
        });
        
        // Track if user manually sets a different end date
        if (name === 'endDate') {
            setHasManualEndDate(true);
        }
    };
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

        // Create Date objects from the local time parts in the form.
        // The browser's `new Date()` will correctly interpret these as local time.
        const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
        const endDateTime = formData.no_end_time ? null : new Date(`${formData.endDate}T${formData.endTime}`);

        const payload = {
            ...formData,
            // Convert to a standardized UTC ISO string before sending.
            start_time: startDateTime.toISOString(),
            end_time: endDateTime ? endDateTime.toISOString() : null,
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
            onClose(); // This will trigger a refresh in the parent
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
            // If it's a booked event that was added to user's calendar, use the booking_id
            // Otherwise use the event's own ID
            const url = isBookedEvent
              ? `/api/events/bookings/${selectedEvent.booking_id || selectedEvent.id}`
              : `/api/events/manual/${selectedEvent.id}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
    
            if (!response.ok) {
                let errorMessage = `Failed to ${isBookedEvent ? 'cancel' : 'delete'} event`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch {}
                throw new Error(errorMessage);
            }
            onClose();
        } catch (err) {
            console.error('Delete error:', err);
            if (err.name === 'AbortError') {
                setError('Request timed out. The action may have still succeeded.');
            } else {
                setError(err.message);
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
        setIsRecurrenceModalOpen(false);
        if (recurrenceAction.action === 'save') {
            performSave(scope);
        } else if (recurrenceAction.action === 'delete') {
            performDelete(scope);
        }
    };

    const handleDeleteConfirm = () => {
        setIsConfirmDeleteOpen(false);
        performDelete('all');
    };

    const formatUtcDateTime = (date) => {
        return new Date(date).toISOString().replace(/-|:|\.\d+/g, '');
    };

    const handleDownloadIcs = () => {
        if (!selectedEvent) return;
        const { id, title, start_time, end_time, location } = selectedEvent;
        const finalDescription = (isBookedEvent ? cleanDescription : formData.description || '').replace(/\n/g, '\\n');

        const icsContent = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MyCalBook//App v1.0//EN',
            'BEGIN:VEVENT', `UID:${id}@mycalbook.com`, `DTSTAMP:${formatUtcDateTime(new Date())}`,
            `DTSTART:${formatUtcDateTime(start_time)}`, `DTEND:${formatUtcDateTime(end_time)}`,
            `SUMMARY:${title}`, `DESCRIPTION:${finalDescription}`, `LOCATION:${location || ''}`,
            'END:VEVENT', 'END:VCALENDAR'
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

    const renderDetailsView = () => (
        <div className="space-y-4">
            <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-lg">
                <p className="font-semibold text-lg">{selectedEvent.title}</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                    {selectedEvent.is_all_day
                        ? `All day on ${format(new Date(selectedEvent.start_time), "EEEE, MMMM d, yyyy")}`
                        : selectedEvent.end_time
                            ? `${format(new Date(selectedEvent.start_time), "EEEE, MMMM d, yyyy")} from ${format(new Date(selectedEvent.start_time), "HH:mm")} to ${format(new Date(selectedEvent.end_time), "HH:mm")}`
                            : `${format(new Date(selectedEvent.start_time), "EEEE, MMMM d, yyyy")} at ${format(new Date(selectedEvent.start_time), "HH:mm")}`
                    }
                </p>
            </div>

            <div className="space-y-3">
                {isBookedEvent ? (
                    <>
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                            <User size={16} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                            <span>Booked by: <strong className="text-slate-900 dark:text-white">{selectedEvent.booker_name || 'You'}</strong></span>
                        </div>
                        {selectedEvent.booker_email && (
                            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                <Mail size={16} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                                <span>{selectedEvent.booker_email}</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                         <div className={`w-3 h-3 rounded-full mr-1 ${
                            {personal: 'bg-amber-500', blocked: 'bg-red-500', birthday: 'bg-pink-500'}[selectedEvent.type] || 'bg-slate-500'
                         }`}></div>
                         <span className="capitalize">{selectedEvent.type} Event</span>
                    </div>
                )}
                
                {formData.guests && formData.guests.length > 0 && (
                    <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                        <Users size={16} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-1" />
                        <div className="flex flex-col">
                            <span>Guests:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {formData.guests.map(g => <span key={g} className="px-2 py-0.5 bg-slate-300 dark:bg-slate-600 rounded-full text-xs font-semibold">{g}</span>)}
                            </div>
                        </div>
                    </div>
                )}
                {(isBookedEvent ? cleanDescription : selectedEvent.description) && (
                    <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                        <FileText size={16} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-1" />
                        <p className="whitespace-pre-wrap">{isBookedEvent ? cleanDescription : selectedEvent.description}</p>
                    </div>
                )}
                {bookingManagementLink && (
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                        <LinkIcon size={16} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                        <a href={bookingManagementLink} target="_blank" rel="noopener noreferrer" className="text-indigo-500 dark:text-indigo-400 hover:underline break-all">
                            Manage this booking
                        </a>
                    </div>
                )}
            </div>
            
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="flex-1 flex gap-2">
                    <button type="button" onClick={handleDeleteClick} disabled={isSubmitting} className="flex-1 px-4 py-2 text-sm bg-red-600 rounded-lg font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                        {isBookedEvent ? 'Cancel' : 'Delete'}
                    </button>
                    <button type="button" onClick={handleDownloadIcs} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-slate-300 dark:bg-slate-600 rounded-lg font-semibold hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors">
                        <Download size={16} /> .ics
                    </button>
                </div>
                <div className="flex-1 flex justify-end gap-2">
                    {!isBookedEvent && (
                        <button type="button" onClick={() => setView('form')} className="px-4 py-2 text-sm bg-slate-300 dark:bg-slate-600 rounded-lg font-semibold hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors">
                            <Edit size={16}/>
                        </button>
                    )}
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-indigo-500 rounded-lg font-semibold text-white hover:bg-indigo-600 transition-colors">OK</button>
                </div>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl shadow-2xl w-full max-w-lg p-5 mx-4 transform transition-all overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">
                      {view === 'form' 
                        ? (isEditMode ? 'Edit Event' : 'Add New Event') 
                        : 'Event Details'
                      }
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:bg-slate-700 transition-colors"><X size={20} /></button>
                </div>
                {view === 'details' ? renderDetailsView() : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full bg-slate-200 dark:bg-slate-700 p-2 rounded-md border-2 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="Event Title *"/>
                        <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-200 dark:bg-slate-700 p-2 rounded-md border-2 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors">
                            <option value="personal">Personal Event</option>
                            <option value="blocked">Blocked Time</option>
                            <option value="birthday">Birthday</option>
                        </select>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center justify-between bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                                <label htmlFor="all-day-toggle" className="text-sm font-medium text-slate-600 dark:text-slate-300">All-day</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="all-day-toggle" checked={formData.is_all_day} onChange={handleAllDayToggle} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                                </label>
                            </div>
                            {!formData.is_all_day && (
                                <div className="flex items-center justify-between bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                                    <label htmlFor="no-end-time-toggle" className="text-sm font-medium text-slate-600 dark:text-slate-300">No end</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="no-end-time-toggle" checked={formData.no_end_time} onChange={handleNoEndTimeToggle} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                                    </label>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Start</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className="bg-slate-200 dark:bg-slate-700 p-2 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                                    {!formData.is_all_day && <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className="bg-slate-200 dark:bg-slate-700 p-2 rounded-md border-2 border-slate-300 dark:border-slate-600"/>}
                                </div>
                            </div>
                            {!formData.no_end_time && (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">End</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required className="bg-slate-200 dark:bg-slate-700 p-2 rounded-md border-2 border-slate-300 dark:border-slate-600"/>
                                        {!formData.is_all_day && <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required className="bg-slate-200 dark:bg-slate-700 p-2 rounded-md border-2 border-slate-300 dark:border-slate-600"/>}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="w-full bg-slate-200 dark:bg-slate-700 p-2 rounded-md border-2 border-slate-300 dark:border-slate-600 focus-within:border-indigo-500 transition-colors flex flex-wrap items-center gap-2">
                            {formData.guests.map(g => (
                                <div key={g} className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-300 dark:bg-slate-600 text-sm">
                                    <span>{g}</span>
                                    <button type="button" onClick={() => removeGuest(g)} className="rounded-full hover:bg-black/20 transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            <input type="text" value={guestInput} onChange={(e) => setGuestInput(e.target.value)} onKeyDown={handleGuestKeyDown} placeholder="Add guests..." className="bg-transparent outline-none p-1 text-sm flex-grow min-w-[100px] text-slate-900 dark:text-white placeholder-slate-500"/>
                        </div>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="1" className="w-full bg-slate-200 dark:bg-slate-700 p-2 rounded-md border-2 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors resize-y" placeholder="Notes..."/>
                        <div className="space-y-2 p-2 bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <div className="flex items-center gap-2"><Repeat size={14}/><label className="text-sm font-medium">Repeat</label></div>
                            <select name="frequency" value={formData.recurrence.frequency} onChange={handleRecurrenceChange} className="w-full bg-slate-200 dark:bg-slate-700 p-2 rounded-md border-2 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors text-sm">
                                <option value="">Does not repeat</option>
                                <option value="YEARLY">Yearly</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="WEEKLY">Weekly</option>
                            </select>
                            {formData.recurrence.frequency === 'WEEKLY' && (
                                <div className="flex justify-between gap-1">{weekDays.map(day => <button type="button" key={day.value} onClick={() => handleDayToggle(day.value)} className={`w-9 h-9 rounded-full text-xs font-bold transition-colors ${formData.recurrence.by_day.includes(day.value) ? 'bg-indigo-500 text-white' : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-500'}`}>{day.name}</button>)}</div>
                            )}
                            {formData.recurrence.frequency && (
                                <div className="flex items-center gap-2">
                                    <input type="date" name="end_date" value={formData.recurrence.end_date} onChange={handleRecurrenceChange} className="bg-slate-200 dark:bg-slate-700 p-2 rounded-md w-full border-2 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors" />
                                </div>
                            )}
                        </div>
                        {error && <div className="text-red-400 text-sm bg-red-100 dark:bg-red-900/50 p-2 rounded-lg border border-red-500/30">{error}</div>}
                        <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <button type="button" onClick={() => isEditMode ? setView('details') : onClose()} className="px-4 py-2 bg-slate-300 dark:bg-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-500 rounded-lg text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50 text-white">{isSubmitting ? 'Saving...' : 'Save'}</button>
                        </div>
                    </form>
                )}
            </div>

            <ConfirmationModal isOpen={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)} onConfirm={handleDeleteConfirm} title={isBookedEvent ? "Cancel Booking" : "Delete Event"} message={isBookedEvent ? `Are you sure you want to cancel this booking${selectedEvent?.booker_name ? ` with "${selectedEvent.booker_name}"` : ''}? ${selectedEvent?.booker_email ? 'They will be notified by email.' : ''}` : `Are you sure you want to permanently delete "${selectedEvent?.title}"?`} confirmText={isBookedEvent ? "Yes, Cancel Booking" : "Yes, Delete Event"} />
            <RecurrenceEditModal isOpen={isRecurrenceModalOpen} onClose={() => setIsRecurrenceModalOpen(false)} onConfirm={handleRecurrenceConfirm} verb={recurrenceAction.action}/>
        </div>
    );
};

export default EventModal;