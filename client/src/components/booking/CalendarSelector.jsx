import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isSameMonth, isToday, isSameDay, isBefore, startOfToday } from 'date-fns';

const CalendarSelector = ({ hook, onDateSelect, onMonthChange, selectedDate, availableDays }) => {
    const { days, currentMonth } = hook;
    const monthName = format(currentMonth, 'MMMM yyyy');

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-lg text-slate-900 dark:text-white">{monthName}</h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => onMonthChange('prev')} className="p-2 rounded-md hover:bg-slate-200 dark:bg-slate-700 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => onMonthChange('next')} className="p-2 rounded-md hover:bg-slate-200 dark:bg-slate-700 transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 dark:text-slate-400 pb-2">{day}</div>
                ))}
                {days.map((day, index) => {
                    const isCurrent = isSameMonth(day, currentMonth);
                    const isSelected = isSameDay(day, selectedDate);
                    const today = isToday(day);
                    const isPastDay = isBefore(day, startOfToday());

                    // Check if the day is in availableDays array (comparing full dates)
                    const isAvailable = availableDays.some(availableDay => {
                        return isSameDay(new Date(availableDay), day);
                    });

                    // A day is bookable if it's in the current month, available, and not in the past.
                    const isBookable = isCurrent && isAvailable && !isPastDay;

                    const dayClasses = `
                        w-12 h-12 flex items-center justify-center rounded-full transition-all text-base relative
                        ${!isCurrent ? 'text-slate-600 cursor-not-allowed' : ''}
                        
                        ${isSelected 
                            ? 'bg-indigo-500 text-white font-bold cursor-pointer' 
                            : isBookable 
                                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/40 cursor-pointer' 
                                : isCurrent ? 'text-slate-400 dark:text-slate-500 dark:text-slate-400' : 'text-slate-600'
                        }

                        ${(!isBookable || isPastDay) && isCurrent ? 'cursor-not-allowed opacity-50' : ''}
                    `;
                    
                    return (
                        <div key={index} className="flex justify-center">
                            <button 
                                className={dayClasses}
                                onClick={() => isBookable && onDateSelect(day)}
                                disabled={!isBookable}
                            >
                                {today && !isSelected && (
                                    <span className="absolute -inset-0.5 rounded-full border-2 border-slate-400 dark:border-slate-500"></span>
                                )}
                                <span className="relative">{format(day, 'd')}</span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarSelector;