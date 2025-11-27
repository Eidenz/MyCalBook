import React, { useMemo, useState, useEffect } from 'react';
import { format, isSameMonth, isToday, isSameDay, startOfDay, endOfDay, isBefore, isWithinInterval } from 'date-fns';
import { Users, Repeat, Cake } from 'lucide-react';

const MAX_EVENTS_VISIBLE = 3;
const MAX_EVENTS_VISIBLE_MOBILE = 2;

const EventPill = ({ event, isStart, onClick, isMobile }) => {
    const now = new Date();
    const hasEndTime = event.end_time !== null && event.end_time !== undefined;
    const isPast = hasEndTime && isBefore(new Date(event.end_time), now);
    const isCurrent = hasEndTime && !isPast && isWithinInterval(now, { start: new Date(event.start_time), end: new Date(event.end_time) });
    const isAllDay = event.is_all_day || event.type === 'birthday';
    const isBday = event.type === 'birthday';

    // Calculate progress percentage for current events
    const getProgressPercentage = () => {
        if (!isCurrent || isAllDay || !hasEndTime) return 0;

        const startTime = new Date(event.start_time).getTime();
        const endTime = new Date(event.end_time).getTime();
        const currentTime = now.getTime();

        const totalDuration = endTime - startTime;
        const elapsed = currentTime - startTime;

        return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    };

    const progressPercentage = getProgressPercentage();

    const typeStyles = {
        personal: 'bg-amber-500 hover:bg-amber-400',
        booked: 'bg-green-500 hover:bg-green-400',
        blocked: 'bg-red-500 hover:bg-red-400',
        birthday: 'bg-pink-500 hover:bg-pink-400',
    };

    // Color mappings for progress bars
    const progressColors = {
        personal: { full: '#f59e0b', partial: '#f59e0b99' },
        booked: { full: '#10b981', partial: '#10b98199' },
        blocked: { full: '#ef4444', partial: '#ef444499' },
        birthday: { full: '#ec4899', partial: '#ec489999' },
        default: { full: '#3b82f6', partial: '#3b82f699' }
    };

    const colors = progressColors[event.type] || progressColors.default;
    
    const progressStyle = isCurrent && !isAllDay ? {
        background: `linear-gradient(to right, 
            ${colors.full} 0%, 
            ${colors.full} ${progressPercentage}%, 
            ${colors.partial} ${progressPercentage}%, 
            ${colors.partial} 100%)`
    } : {};

    const pillClass = `
        text-slate-900 dark:text-white text-xs cursor-pointer 
        flex items-center gap-1.5
        truncate transition-all duration-300
        relative overflow-hidden
        ${isPast && !isAllDay 
            ? 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 opacity-70' 
            : isCurrent && !isAllDay 
                ? 'hover:brightness-110 border-2 border-sky-400'
                : typeStyles[event.type] || 'bg-blue-500 hover:bg-blue-400'}
        ${isMobile ? 'px-1 py-0.5 mb-0.5 rounded' : 'p-1 mb-1 rounded-md'}
    `;

    const guests = event.guests ? JSON.parse(event.guests) : [];

    // Special rendering for events with no end time
    if (!hasEndTime && !isAllDay) {
        const typeColors = {
            personal: 'bg-amber-500',
            booked: 'bg-green-500',
            blocked: 'bg-red-500',
            birthday: 'bg-pink-500',
        };
        const dotColor = typeColors[event.type] || 'bg-blue-500';

        return (
            <div
                className="flex items-center gap-1 mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onClick(event)}
            >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}></div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white flex-shrink-0">{format(new Date(event.start_time), 'HH:mm')}</span>
                <span className="text-xs text-slate-900 dark:text-white truncate">{event.title}</span>
            </div>
        );
    }

    if (isMobile) {
        if (isBday) {
            return (
                <div 
                    className={pillClass} 
                    onClick={() => onClick(event)}
                    style={progressStyle}
                >
                    <Cake size={10} className="flex-shrink-0"/>
                    <span className="font-semibold text-xs truncate flex items-center gap-1">
                        {event.title}
                    </span>
                </div>
            );
        }
        return (
            <div 
                className={pillClass} 
                onClick={() => onClick(event)}
                style={progressStyle}
            >
                <span className="font-semibold text-xs truncate flex items-center gap-1">
                    {isAllDay ? 'Full' : `${format(new Date(event.start_time), 'HH:mm')}`}
                </span>
            </div>
        );
    }

    return (
        <div 
            className={pillClass} 
            onClick={() => onClick(event)}
            style={progressStyle}
        >
            {isStart ? (
                <>
                    {isBday && <Cake size={12} className="flex-shrink-0"/>}
                    {event.recurrence_id && !isAllDay && <Repeat size={12} className="flex-shrink-0"/>}
                    {!isAllDay && hasEndTime && (
                        <span className="font-semibold flex-shrink-0">
                            {format(new Date(event.start_time), 'HH:mm')}-{format(new Date(event.end_time), 'HH:mm')}
                        </span>
                    )}
                    <span className="truncate ml-1">{event.title}</span>
                    {guests.length > 0 && (
                        <span className="flex items-center gap-1 ml-auto text-slate-900 dark:text-white/80 pl-1">
                            <Users size={12} />
                            <span>{guests.length}</span>
                        </span>
                    )}
                </>
            ) : (
                <span className="truncate opacity-70">{event.title}</span>
            )}
        </div>
    );
};

const MonthView = ({ days, month, events = [], onEventClick, onShowMoreClick }) => {
    const [isMobile, setIsMobile] = useState(false);
    const [maxEventsForScreen, setMaxEventsForScreen] = useState(MAX_EVENTS_VISIBLE);

    useEffect(() => {
        const checkScreenSize = () => {
            // Mobile detection for UI rendering (narrow screens)
            const isSmallWidth = window.innerWidth < 768;
            setIsMobile(isSmallWidth);

            // Separate check for how many events to show based on screen height
            // 1080p screens (1920x1080) and below: show 2 events max
            // 1440p screens (2560x1440) and above: show 3 events max
            const isSmallHeight = window.innerHeight < 1100;
            setMaxEventsForScreen(isSmallWidth || isSmallHeight ? MAX_EVENTS_VISIBLE_MOBILE : MAX_EVENTS_VISIBLE);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    const eventsByDay = useMemo(() => {
        const dayMap = new Map();
        for (const day of days) { dayMap.set(day.toDateString(), []); }

        const sortedEvents = [...events].sort((a, b) => {
            const aIsAllDay = a.is_all_day || a.type === 'birthday';
            const bIsAllDay = b.is_all_day || b.type === 'birthday';
            // All-day events first
            if (aIsAllDay !== bIsAllDay) {
                return aIsAllDay ? -1 : 1;
            }
            // Then by start time
            return new Date(a.start_time) - new Date(b.start_time);
        });

        for (const event of sortedEvents) {
            const start = startOfDay(new Date(event.start_time));
            // Events with no end time only appear on their start day
            const end = event.end_time ? endOfDay(new Date(event.end_time)) : new Date(start);
            for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
                const dayString = d.toDateString();
                if (dayMap.has(dayString)) { dayMap.get(dayString).push(event); }
            }
        }
        return dayMap;
    }, [events, days]);

    return (
        <div className="grid grid-cols-7 h-full">
            {days.map((day) => {
                const dayKey = day.toDateString();
                const dayEvents = eventsByDay.get(dayKey) || [];
                const isCurrentMonth = isSameMonth(day, month);
                const today = isToday(day);

                // For today, prioritize upcoming events (events that haven't ended yet)
                let eventsToShow = dayEvents;
                if (today) {
                    const now = new Date();
                    const upcomingEvents = dayEvents.filter(event => {
                        if (!event.end_time) return true; // Events without end time are always shown
                        return new Date(event.end_time) > now;
                    });
                    const pastEvents = dayEvents.filter(event => {
                        if (!event.end_time) return false;
                        return new Date(event.end_time) <= now;
                    });
                    // Show upcoming first, then past events
                    eventsToShow = [...upcomingEvents, ...pastEvents];
                }

                const visibleEvents = eventsToShow.slice(0, maxEventsForScreen);
                const hiddenCount = Math.max(0, eventsToShow.length - maxEventsForScreen);

                const cellClasses = `
                    border-r border-b border-slate-300 dark:border-slate-700 p-1 md:p-2 flex flex-col transition-colors duration-300
                    ${isMobile ? 'min-h-[80px]' : 'min-h-[120px]'}
                    ${isCurrentMonth ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50' : 'bg-slate-50 dark:bg-slate-900 text-slate-600'}
                `;

                const dateClasses = `
                    font-semibold text-sm md:text-base
                    ${today ? 'bg-indigo-500 text-white rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-xs md:text-sm' : ''}
                    ${!isCurrentMonth ? 'text-slate-700' : ''}
                `;

                return (
                    <div key={dayKey} className={cellClasses}>
                        <div className="flex items-center justify-between mb-1 md:mb-2 gap-1">
                            <div className={dateClasses}>{format(day, 'd')}</div>
                            {hiddenCount > 0 && (
                                <div
                                    className="text-xs font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full cursor-pointer hover:bg-indigo-600 transition-colors flex-shrink-0"
                                    onClick={() => onShowMoreClick(day, dayEvents)}
                                    title={`${hiddenCount} more event${hiddenCount > 1 ? 's' : ''}`}
                                >
                                    +{hiddenCount}
                                </div>
                            )}
                        </div>
                        <div className="flex-grow overflow-hidden">
                            {visibleEvents.map(event =>
                                <EventPill
                                    key={`${event.id}-${dayKey}`}
                                    event={event}
                                    isStart={isSameDay(day, new Date(event.start_time))}
                                    onClick={onEventClick}
                                    isMobile={isMobile}
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MonthView;