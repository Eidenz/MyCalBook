import React from 'react';
import { format, isSameMonth, isToday, isSameDay } from 'date-fns';
import EventPill from './EventPill';

const CalendarCell = ({ day, month, eventsForDay, onEventClick }) => {
    const isCurrentMonth = isSameMonth(day, month);
    const today = isToday(day);

    const cellClasses = `
        border-r border-b border-slate-300 dark:border-slate-700 p-2 flex flex-col min-h-[120px] 
        transition-colors duration-300
        ${isCurrentMonth ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50' : 'bg-slate-50 dark:bg-slate-900 text-slate-600'}
    `;

    const dateClasses = `
        font-semibold mb-2
        ${today ? 'bg-indigo-600 text-slate-900 dark:text-white rounded-full w-7 h-7 flex items-center justify-center' : ''}
        ${!isCurrentMonth ? 'text-slate-700' : ''}
    `;

    return (
        <div className={cellClasses}>
            <div className={dateClasses}>{format(day, 'd')}</div>
            <div className="flex-grow overflow-y-auto">
                {eventsForDay.map(event => (
                    <EventPill key={event.id} event={event} onClick={onEventClick} />
                ))}
            </div>
        </div>
    );
};

export default CalendarCell;