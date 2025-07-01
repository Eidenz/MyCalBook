import React, { useMemo } from 'react';
import { format, isSameMonth, isToday, isSameDay, startOfDay, endOfDay } from 'date-fns';

const MAX_EVENTS_VISIBLE = 3; // Show 3 events, then "+X more"

const EventPill = ({ event, isStart, onClick }) => {
    const typeStyles = {
        personal: 'bg-amber-500 hover:bg-amber-400',
        booked: 'bg-green-500 hover:bg-green-400',
        blocked: 'bg-red-500 hover:bg-red-400',
    };

    const pillClass = `
        text-white text-xs p-1 rounded-md mb-1 cursor-pointer 
        flex items-center gap-1.5
        truncate transition-colors duration-200
        ${typeStyles[event.type] || 'bg-blue-500 hover:bg-blue-400'}
    `;

    return (
        <div className={pillClass} onClick={() => onClick(event)}>
            {isStart && (
                <>
                    <span className="font-semibold flex-shrink-0">
                        {format(new Date(event.start_time), 'HH:mm')}-{format(new Date(event.end_time), 'HH:mm')}
                    </span>
                    <span className="truncate ml-1.5">{event.title}</span>
                </>
            )}
            {!isStart && (
                <span className="truncate opacity-70">{event.title}</span>
            )}
        </div>
    );
};


const CalendarGrid = ({ days, month, events = [], onEventClick, onShowMoreClick }) => {
    // useMemo will cache the expensive event processing, re-running only when events change.
    const eventsByDay = useMemo(() => {
        const dayMap = new Map();
        
        // Initialize map for each day in the visible grid
        for (const day of days) {
            dayMap.set(day.toDateString(), []);
        }

        // Sort events by duration first, then start time. This helps with layout.
        const sortedEvents = [...events].sort((a, b) => {
            const durationA = new Date(a.end_time) - new Date(a.start_time);
            const durationB = new Date(b.end_time) - new Date(b.start_time);
            if (durationB !== durationA) return durationB - durationA;
            return new Date(a.start_time) - new Date(b.start_time);
        });

        // Place each event into the map for each day it covers
        for (const event of sortedEvents) {
            const start = startOfDay(new Date(event.start_time));
            const end = endOfDay(new Date(event.end_time));
            
            for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
                const dayString = d.toDateString();
                if (dayMap.has(dayString)) {
                    dayMap.get(dayString).push(event);
                }
            }
        }
        return dayMap;
    }, [events, days]);

    return (
        <div className="grid grid-cols-7 flex-1">
            {days.map((day) => {
                const dayKey = day.toDateString();
                const dayEvents = eventsByDay.get(dayKey) || [];
                
                const visibleEvents = dayEvents.slice(0, MAX_EVENTS_VISIBLE);
                const hiddenCount = Math.max(0, dayEvents.length - MAX_EVENTS_VISIBLE);

                const isCurrentMonth = isSameMonth(day, month);
                const today = isToday(day);
                
                const cellClasses = `
                    border-r border-b border-slate-700 p-2 flex flex-col min-h-[120px] 
                    transition-colors duration-300
                    ${isCurrentMonth ? 'bg-slate-800 hover:bg-slate-700/50' : 'bg-slate-900 text-slate-600'}
                `;
                const dateClasses = `
                    font-semibold mb-2 self-start
                    ${today ? 'bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : ''}
                    ${!isCurrentMonth ? 'text-slate-700' : ''}
                `;

                return (
                    <div key={dayKey} className={cellClasses}>
                        <div className={dateClasses}>
                            {format(day, 'd')}
                        </div>
                        <div className="flex-grow overflow-hidden">
                            {visibleEvents.map(event => (
                                <EventPill 
                                    key={event.id} 
                                    event={event} 
                                    isStart={isSameDay(day, new Date(event.start_time))}
                                    onClick={onEventClick}
                                />
                            ))}
                            {hiddenCount > 0 && (
                                <div 
                                    className="text-xs text-slate-400 mt-1 cursor-pointer hover:underline"
                                    // Make the link clickable and pass the day and ALL its events
                                    onClick={() => onShowMoreClick(day, dayEvents)}
                                >
                                    + {hiddenCount} more
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CalendarGrid;