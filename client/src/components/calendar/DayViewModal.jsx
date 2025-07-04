import React from 'react';
import { X, Users } from 'lucide-react';
import { format, isBefore, isWithinInterval } from 'date-fns';

const DayViewModal = ({ isOpen, onClose, day, events, onEventClick }) => {
    if (!isOpen) return null;
    const now = new Date();

    const EventRow = ({ event }) => {
        const guests = event.guests ? JSON.parse(event.guests) : [];
        const now = new Date();
        const isPast = isBefore(new Date(event.end_time), now);
        const isCurrent = !isPast && isWithinInterval(now, { start: new Date(event.start_time), end: new Date(event.end_time) });

        const typeStyles = {
            personal: 'bg-amber-500',
            booked: 'bg-green-500',
            blocked: 'bg-red-500',
            birthday: 'bg-pink-500',
        };

        const dotClass = `
            w-2 h-2 rounded-full mr-4 mt-2 flex-shrink-0
            ${isPast ? 'bg-slate-500' : typeStyles[event.type]}
            ${isCurrent ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-sky-400' : ''}
        `;


        return (
            <div 
                className={`flex items-start p-3 -mx-3 rounded-lg hover:bg-slate-200 dark:bg-slate-700 cursor-pointer transition-colors ${isPast ? 'opacity-70' : ''}`}
                onClick={() => {
                    onEventClick(event);
                    onClose();
                }}
            >
                <div className={dotClass}></div>
                <div className="flex-grow">
                    <p className="font-semibold text-slate-900 dark:text-white">{event.title}</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
                        {event.type === 'birthday' 
                            ? 'All Day' 
                            : `${format(new Date(event.start_time), 'HH:mm')} - ${format(new Date(event.end_time), 'HH:mm')}`}
                    </p>
                    {guests.length > 0 && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                            <Users size={14} />
                            <span>{guests.join(', ')}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Events for {format(day, 'MMMM d, yyyy')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:bg-slate-700"><X size={24} /></button>
                </div>
                <div className="space-y-1">
                    {events.length > 0 ? (
                        events.map(event => <EventRow key={event.id} event={event} />)
                    ) : (
                        <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400">No events for this day.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DayViewModal;