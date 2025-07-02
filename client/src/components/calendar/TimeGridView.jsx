import React, { useMemo } from 'react';
import { format, startOfDay, endOfDay, getHours, getMinutes, isToday, isSameDay, addDays, differenceInDays } from 'date-fns';
import { Users } from 'lucide-react';

const TimeGridEvent = ({ event, onClick, dayIndex, totalDays, isStart, isEnd, isSingleDay }) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);

    const startMinutes = getHours(start) * 60 + getMinutes(start);
    const endMinutes = getHours(end) * 60 + getMinutes(end);
    
    // For multi-day events, adjust the display
    let displayStart = startMinutes;
    let displayEnd = endMinutes;
    
    if (!isSingleDay) {
        if (!isStart) displayStart = 0; // Start at midnight if not the first day
        if (!isEnd) displayEnd = 24 * 60; // End at midnight if not the last day
    }
    
    const durationMinutes = Math.max(30, displayEnd - displayStart);
    const top = (displayStart / (24 * 60)) * 100;
    const height = (durationMinutes / (24 * 60)) * 100;
    
    const typeStyles = {
        personal: 'bg-amber-500/80 border-amber-400',
        booked: 'bg-green-500/80 border-green-400',
        blocked: 'bg-red-500/80 border-red-400',
    };
    
    const guests = event.guests ? JSON.parse(event.guests) : [];
    
    // Multi-day styling adjustments
    let roundingClasses = 'rounded-lg';
    if (!isSingleDay) {
        if (isStart && !isEnd) roundingClasses = 'rounded-l-lg rounded-r-none';
        else if (!isStart && isEnd) roundingClasses = 'rounded-r-lg rounded-l-none';
        else if (!isStart && !isEnd) roundingClasses = 'rounded-none';
    }
    
    return (
        <div
            onClick={() => onClick(event)}
            style={{ top: `${top}%`, height: `${height}%` }}
            className={`absolute left-0 right-0 mx-0.5 md:mx-1 p-1 md:p-2 text-white border-l-4 cursor-pointer overflow-hidden backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${typeStyles[event.type]} ${roundingClasses}`}
        >
            <p className="font-semibold text-xs md:text-sm truncate">{event.title}</p>
            <p className="text-xs opacity-80">
                {isStart ? format(start, 'HH:mm') : '00:00'} - {isEnd ? format(end, 'HH:mm') : '24:00'}
            </p>
            {guests.length > 0 && isStart && (
                <div className="flex items-center gap-1 text-xs opacity-90 mt-1">
                    <Users size={10} className="md:w-3 md:h-3" />
                    <span>{guests.length}</span>
                </div>
            )}
            {!isSingleDay && (
                <div className="absolute top-1 right-1">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white/30 rounded-full"></div>
                </div>
            )}
        </div>
    );
};

const TimeGridView = ({ days, events, onEventClick }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const eventsByDay = useMemo(() => {
        const dayMap = new Map();
        days.forEach(day => dayMap.set(format(day, 'yyyy-MM-dd'), []));
        
        // Fixed multi-day event handling
        events.forEach(event => {
            const eventStart = startOfDay(new Date(event.start_time));
            const eventEnd = startOfDay(new Date(event.end_time));
            
            // Loop through all days the event spans
            let currentDay = eventStart;
            while (currentDay <= eventEnd) {
                const dayStr = format(currentDay, 'yyyy-MM-dd');
                if (dayMap.has(dayStr)) {
                    const isStart = isSameDay(currentDay, eventStart);
                    const isEnd = isSameDay(currentDay, eventEnd);
                    const isSingleDay = isSameDay(eventStart, eventEnd);
                    
                    dayMap.get(dayStr).push({
                        ...event,
                        isStart,
                        isEnd,
                        isSingleDay
                    });
                }
                currentDay = addDays(currentDay, 1);
            }
        });
        
        return dayMap;
    }, [days, events]);

    // Fixed grid template columns to match between header and content
    const gridTemplateColumns = `repeat(${days.length}, minmax(0, 1fr))`;

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header - Fixed alignment by using same grid template */}
            <div className="flex sticky top-0 bg-slate-800 z-10 border-b border-slate-700">
                {/* Time column - exact same width and styling as grid */}
                <div className="w-14 shrink-0 border-r border-slate-700 flex items-end justify-end pb-2 pr-2">
                    <span className="text-xs text-slate-400">GMT</span>
                </div>
                {/* Days grid - now uses same template as main grid */}
                <div className="flex-1 grid" style={{ gridTemplateColumns }}>
                    {days.map(day => (
                        <div key={day.toString()} className="text-center py-2 md:py-3 border-r border-slate-700 last:border-r-0 min-w-0 px-1">
                            <span className="text-xs text-slate-400 block">{format(day, 'EEE')}</span>
                            <p className={`text-lg md:text-xl font-bold truncate ${isToday(day) ? 'text-indigo-400' : 'text-white'}`}>
                                {format(day, 'd')}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Grid container with mobile horizontal scroll */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex overflow-y-auto">
                    {/* Time Scale - exact same width as header */}
                    <div className="w-14 shrink-0 text-right pr-2 border-r border-slate-700 bg-slate-900/20">
                        {hours.map(hour => (
                            <div key={hour} className="h-12 md:h-16 flex items-start pt-1">
                                <span className="text-xs text-slate-400 leading-none">
                                    {format(new Date(2000, 0, 1, hour), 'ha')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Event Grid - uses same grid template as header */}
                    <div className="flex-1 min-w-0">
                        <div className="grid h-full" style={{ gridTemplateColumns }}>
                            {days.map((day, dayIndex) => (
                                <div key={day.toString()} className="relative border-r border-slate-700 last:border-r-0 min-w-0">
                                    {/* Hour lines */}
                                    {hours.map(hour => (
                                        <div key={hour} className="h-12 md:h-16 border-b border-slate-700/50"></div>
                                    ))}
                                    
                                    {/* Events for this day */}
                                    {(eventsByDay.get(format(day, 'yyyy-MM-dd')) || []).map(event => (
                                        <TimeGridEvent 
                                            key={`${event.id}-${dayIndex}`} 
                                            event={event} 
                                            onClick={onEventClick}
                                            dayIndex={dayIndex}
                                            totalDays={days.length}
                                            isStart={event.isStart}
                                            isEnd={event.isEnd}
                                            isSingleDay={event.isSingleDay}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeGridView;