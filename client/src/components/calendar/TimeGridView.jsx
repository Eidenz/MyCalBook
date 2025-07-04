import React, { useMemo, useState, useEffect } from 'react';
import { format, startOfDay, endOfDay, getHours, getMinutes, isToday, isSameDay, addDays, isBefore, isWithinInterval } from 'date-fns';
import { Users, Repeat, Cake } from 'lucide-react';

const AllDayEvent = ({ event, onClick, isMobile }) => {
    const typeStyles = {
        personal: 'bg-amber-500/90 border-amber-400',
        booked: 'bg-green-500/90 border-green-400',
        blocked: 'bg-red-500/90 border-red-400',
        birthday: 'bg-pink-500/90 border-pink-400',
    };

    const guests = event.guests ? JSON.parse(event.guests) : [];

    return (
        <div
            onClick={() => onClick(event)}
            className={`mx-0.5 md:mx-1 mb-1 p-1.5 md:p-2 text-slate-900 dark:text-white border-l-4 cursor-pointer rounded-lg backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                typeStyles[event.type] || 'bg-blue-500/90 border-blue-400'
            }`}
        >
            <div className="flex items-center gap-1.5">
                {event.type === 'birthday' && <Cake size={isMobile ? 12 : 14} className="opacity-90 flex-shrink-0" />}
                {event.recurrence_id && <Repeat size={isMobile ? 12 : 14} className="opacity-90 flex-shrink-0" />}
                <p className="font-semibold text-xs md:text-sm truncate flex-1">{event.title}</p>
                {guests.length > 0 && (
                    <div className="flex items-center gap-1 text-xs opacity-90 ml-auto">
                        <Users size={isMobile ? 10 : 12} />
                        <span>{guests.length}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const TimeGridEvent = ({ event, onClick, dayIndex, totalDays, isStart, isEnd, isSingleDay, isMobile, now }) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);

    const startMinutes = getHours(start) * 60 + getMinutes(start);
    const endMinutes = getHours(end) * 60 + getMinutes(end);
    
    let displayStart = startMinutes;
    let displayEnd = endMinutes;
    
    if (!isSingleDay) {
        if (!isStart) displayStart = 0;
        if (!isEnd) displayEnd = 24 * 60;
    }
    
    const durationMinutes = Math.max(30, displayEnd - displayStart);
    const top = (displayStart / (24 * 60)) * 100;
    const height = (durationMinutes / (24 * 60)) * 100;
    
    const isPast = isBefore(new Date(event.end_time), now);
    const isCurrent = !isPast && isWithinInterval(now, { start: new Date(event.start_time), end: new Date(event.end_time) });
    
    const typeStyles = {
        personal: 'bg-amber-500/80 border-amber-400',
        booked: 'bg-green-500/80 border-green-400',
        blocked: 'bg-red-500/80 border-red-400',
        birthday: 'bg-pink-500/80 border-pink-400',
    };
    
    const guests = event.guests ? JSON.parse(event.guests) : [];
    
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
            className={`absolute left-0 right-0 mx-0.5 md:mx-1 p-1 md:p-2 text-slate-900 dark:text-white border-l-4 cursor-pointer overflow-hidden backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                isPast && event.type !== 'birthday' ? 'bg-slate-300 dark:bg-slate-600/80 border-slate-400 dark:border-slate-500 opacity-70' : typeStyles[event.type]
            } ${isCurrent && event.type !== 'birthday' ? 'ring-2 ring-sky-400 z-10' : ''} ${roundingClasses}`}
        >
            <div className="flex flex-col h-full">
                <div className="flex items-start gap-1">
                    {event.recurrence_id && <Repeat size={isMobile ? 10 : 12} className="opacity-80 mt-0.5 flex-shrink-0" />}
                    <p className="font-semibold text-xs md:text-sm truncate flex-1">{event.title}</p>
                </div>
                {!isMobile && (
                    <p className="text-xs opacity-80">
                        {isStart ? format(start, 'HH:mm') : '00:00'} - {isEnd ? format(end, 'HH:mm') : '24:00'}
                    </p>
                )}
                 {guests.length > 0 && isStart && (
                    <div className="flex items-center gap-1 text-xs opacity-90 mt-auto">
                        <Users size={isMobile ? 10 : 12} />
                        <span>{guests.length}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const TimeGridView = ({ days, events, onEventClick }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const [isMobile, setIsMobile] = useState(false);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60 * 1000); 
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const { timedEventsByDay, allDayEventsByDay } = useMemo(() => {
        const timedDayMap = new Map();
        const allDayDayMap = new Map();
        
        days.forEach(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            timedDayMap.set(dayStr, []);
            allDayDayMap.set(dayStr, []);
        });
        
        events.forEach(event => {
            const eventStart = startOfDay(new Date(event.start_time));
            const eventEnd = startOfDay(new Date(event.end_time));
            
            let currentDay = eventStart;
            while (currentDay <= eventEnd) {
                const dayStr = format(currentDay, 'yyyy-MM-dd');
                if (timedDayMap.has(dayStr)) {
                    const isStart = isSameDay(currentDay, eventStart);
                    const isEnd = isSameDay(currentDay, eventEnd);
                    const isSingleDay = isSameDay(eventStart, eventEnd);
                    
                    const eventWithFlags = { ...event, isStart, isEnd, isSingleDay };
                    
                    // Separate birthday events as all-day events
                    if (event.type === 'birthday') {
                        allDayDayMap.get(dayStr).push(eventWithFlags);
                    } else {
                        timedDayMap.get(dayStr).push(eventWithFlags);
                    }
                }
                currentDay = addDays(currentDay, 1);
            }
        });
        
        return { timedEventsByDay: timedDayMap, allDayEventsByDay: allDayDayMap };
    }, [days, events]);

    const gridTemplateColumns = `repeat(${days.length}, minmax(0, 1fr))`;
    const currentTimePosition = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;

    // Check if there are any all-day events to show
    const hasAllDayEvents = Array.from(allDayEventsByDay.values()).some(events => events.length > 0);

    return (
        <div className="flex-1 flex flex-col overflow-y-scroll">
            {/* Header with day names */}
            <div className="flex sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 border-b border-slate-300 dark:border-slate-700">
                <div className="w-14 shrink-0 border-r border-slate-300 dark:border-slate-700 flex items-end justify-end pb-2 pr-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">GMT</span>
                </div>
                <div className="flex-1 grid" style={{ gridTemplateColumns }}>
                    {days.map(day => (
                        <div key={day.toString()} className="text-center py-2 md:py-3 border-r border-slate-300 dark:border-slate-700 last:border-r-0 min-w-0 px-1">
                            <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 block">{format(day, 'EEE')}</span>
                            <p className={`text-lg md:text-xl font-bold truncate ${isToday(day) ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>{format(day, 'd')}</p>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* All-day events section */}
            {hasAllDayEvents && (
                <div className="flex bg-slate-100/50 dark:bg-slate-100 dark:bg-slate-800/50 border-b border-slate-300 dark:border-slate-700">
                    <div className="w-14 shrink-0 border-r border-slate-300 dark:border-slate-700 flex items-start justify-end pt-2 pr-2">
                        <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 leading-none">All day</span>
                    </div>
                    <div className="flex-1 grid py-2" style={{ gridTemplateColumns }}>
                        {days.map(day => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const dayAllDayEvents = allDayEventsByDay.get(dayStr) || [];
                            
                            return (
                                <div key={`allday-${day.toString()}`} className="border-r border-slate-300 dark:border-slate-700/50 last:border-r-0 min-w-0 px-1">
                                    {dayAllDayEvents.map(event => (
                                        <AllDayEvent 
                                            key={`allday-${event.id}-${dayStr}`} 
                                            event={event} 
                                            onClick={onEventClick}
                                            isMobile={isMobile}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* Time grid section */}
            <div className="flex-1 flex">
                <div className="flex-1 flex">
                    <div className="w-14 shrink-0 text-right pr-2 border-r border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20">
                        {hours.map(hour => <div key={hour} className="h-12 md:h-16 flex items-start pt-1"><span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 leading-none">{format(new Date(2000, 0, 1, hour), 'ha')}</span></div>)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="grid h-full" style={{ gridTemplateColumns }}>
                            {days.map((day, dayIndex) => (
                                <div key={day.toString()} className="relative border-r border-slate-300 dark:border-slate-700 last:border-r-0 min-w-0">
                                    {hours.map(hour => <div key={hour} className="h-12 md:h-16 border-b border-slate-300 dark:border-slate-700/50"></div>)}
                                    {isToday(day) && (
                                        <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${currentTimePosition}%` }}>
                                            <div className="relative h-px bg-red-400"><div className="absolute -left-1.5 -top-[5px] w-3 h-3 bg-red-400 rounded-full ring-2 ring-white dark:ring-slate-800"></div></div>
                                        </div>
                                    )}
                                    {(timedEventsByDay.get(format(day, 'yyyy-MM-dd')) || []).map(event => (
                                        <TimeGridEvent key={`${event.id}-${dayIndex}`} event={event} onClick={onEventClick} dayIndex={dayIndex} totalDays={days.length} isStart={event.isStart} isEnd={event.isEnd} isSingleDay={event.isSingleDay} isMobile={isMobile} now={now} />
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