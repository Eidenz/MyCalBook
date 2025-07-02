import React, { useMemo, useState, useEffect } from 'react';
import { format, isSameMonth, isToday, isSameDay, startOfDay, endOfDay, isBefore, isWithinInterval } from 'date-fns';
import { Users } from 'lucide-react'; // Import the Users icon

const MAX_EVENTS_VISIBLE = 3;
const MAX_EVENTS_VISIBLE_MOBILE = 4; // Show more events on mobile since they're smaller

const EventPill = ({ event, isStart, onClick, isMobile }) => {
    const now = new Date();
    const isPast = isBefore(new Date(event.end_time), now);
    const isCurrent = !isPast && isWithinInterval(now, { start: new Date(event.start_time), end: new Date(event.end_time) });

    const typeStyles = {
        personal: 'bg-amber-500 hover:bg-amber-400',
        booked: 'bg-green-500 hover:bg-green-400',
        blocked: 'bg-red-500 hover:bg-red-400',
    };

    const pillClass = `
        text-white text-xs cursor-pointer 
        flex items-center gap-1.5
        truncate transition-colors duration-200
        ${isPast 
            ? 'bg-slate-600 hover:bg-slate-500 opacity-70' 
            : typeStyles[event.type] || 'bg-blue-500 hover:bg-blue-400'}
        ${isCurrent ? 'ring-2 ring-sky-400' : ''}
        ${isMobile ? 'p-0.5 mb-0.5 rounded' : 'p-1 mb-1 rounded-md'}
    `;

    // Safely parse guests
    const guests = event.guests ? JSON.parse(event.guests) : [];

    if (isMobile) {
        // Mobile: Show only time for all events
        return (
            <div className={pillClass} onClick={() => onClick(event)}>
                <span className="font-semibold text-xs">
                    {format(new Date(event.start_time), 'HH:mm')}
                </span>
                {guests.length > 0 && (
                    <span className="flex items-center gap-0.5 ml-auto text-white/80">
                        <Users size={10} />
                        <span className="text-xs">{guests.length}</span>
                    </span>
                )}
            </div>
        );
    }

    // Desktop: Show full event details
    return (
        <div className={pillClass} onClick={() => onClick(event)}>
            {isStart && (
                <>
                    <span className="font-semibold flex-shrink-0">
                        {format(new Date(event.start_time), 'HH:mm')}-{format(new Date(event.end_time), 'HH:mm')}
                    </span>
                    <span className="truncate ml-1">{event.title}</span>
                    {guests.length > 0 && (
                        <span className="flex items-center gap-1 ml-auto text-white/80 pl-1">
                            <Users size={12} />
                            <span>{guests.length}</span>
                        </span>
                    )}
                </>
            )}
            {!isStart && (
                <span className="truncate opacity-70">{event.title}</span>
            )}
        </div>
    );
};

const MonthView = ({ days, month, events = [], onEventClick, onShowMoreClick }) => {
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // This logic remains unchanged, as it just passes the event object down.
    const eventsByDay = useMemo(() => {
        const dayMap = new Map();
        for (const day of days) { dayMap.set(day.toDateString(), []); }

        const sortedEvents = [...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

        for (const event of sortedEvents) {
            const start = startOfDay(new Date(event.start_time));
            const end = endOfDay(new Date(event.end_time));
            for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
                const dayString = d.toDateString();
                if (dayMap.has(dayString)) { dayMap.get(dayString).push(event); }
            }
        }
        return dayMap;
    }, [events, days]);

    const maxEventsVisible = isMobile ? MAX_EVENTS_VISIBLE_MOBILE : MAX_EVENTS_VISIBLE;

    return (
        <div className="grid grid-cols-7 flex-1">
            {days.map((day) => {
                const dayKey = day.toDateString();
                const dayEvents = eventsByDay.get(dayKey) || [];
                const visibleEvents = dayEvents.slice(0, maxEventsVisible);
                const hiddenCount = Math.max(0, dayEvents.length - maxEventsVisible);
                const isCurrentMonth = isSameMonth(day, month);
                const today = isToday(day);
                
                // Mobile responsive cell height and styling
                const cellClasses = `
                    border-r border-b border-slate-700 p-1 md:p-2 flex flex-col transition-colors duration-300
                    ${isMobile ? 'min-h-[80px]' : 'min-h-[120px]'}
                    ${isCurrentMonth ? 'bg-slate-800 hover:bg-slate-700/50' : 'bg-slate-900 text-slate-600'}
                `;
                
                const dateClasses = `
                    font-semibold mb-1 md:mb-2 self-start text-sm md:text-base
                    ${today ? 'bg-indigo-600 text-white rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-xs md:text-sm' : ''} 
                    ${!isCurrentMonth ? 'text-slate-700' : ''}
                `;

                return (
                    <div key={dayKey} className={cellClasses}>
                        <div className={dateClasses}>{format(day, 'd')}</div>
                        <div className="flex-grow overflow-hidden">
                            {visibleEvents.map(event => 
                                <EventPill 
                                    key={event.id} 
                                    event={event} 
                                    isStart={isSameDay(day, new Date(event.start_time))} 
                                    onClick={onEventClick}
                                    isMobile={isMobile}
                                />
                            )}
                            {hiddenCount > 0 && (
                                <div 
                                    className={`text-xs text-slate-400 mt-1 cursor-pointer hover:underline ${isMobile ? 'text-xs' : ''}`}
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

export default MonthView;