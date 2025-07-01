import React from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';

const DayViewModal = ({ isOpen, onClose, day, events, onEventClick }) => {
    if (!isOpen) return null;

    const EventRow = ({ event }) => (
        <div 
            className="flex items-center p-3 -mx-3 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors"
            onClick={() => {
                onEventClick(event);
                onClose(); // Close day view to open event editor
            }}
        >
            <div className={`w-2 h-2 rounded-full mr-4 ${event.type === 'personal' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
            <div className="flex-grow">
                <p className="font-semibold text-white">{event.title}</p>
                <p className="text-sm text-slate-400">
                    {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                </p>
            </div>
        </div>
    );

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        Events for {format(day, 'MMMM d, yyyy')}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-1">
                    {events.length > 0 ? (
                        events.map(event => <EventRow key={event.id} event={event} />)
                    ) : (
                        <p className="text-slate-400">No events for this day.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DayViewModal;