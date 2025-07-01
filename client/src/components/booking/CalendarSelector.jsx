import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isSameMonth, isToday, isSameDay } from 'date-fns';

const CalendarSelector = ({ hook, onDateSelect, selectedDate, availableDays }) => {
    const { days, currentMonth, nextMonth, prevMonth } = hook;
    const monthName = format(currentMonth, 'MMMM yyyy');

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-lg text-white">{monthName}</h2>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 rounded-md hover:bg-slate-700 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextMonth} className="p-2 rounded-md hover:bg-slate-700 transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-slate-400 pb-2">{day}</div>
                ))}
                {days.map((day, index) => {
                    const isCurrent = isSameMonth(day, currentMonth);
                    const isSelected = isSameDay(day, selectedDate);
                    const today = isToday(day);
                    const isAvailable = isCurrent && availableDays.includes(day.getDate());

                    const dayClasses = `
                        w-12 h-12 flex items-center justify-center rounded-full cursor-pointer transition-all text-base relative
                        ${!isCurrent ? 'text-slate-600 cursor-not-allowed' : ''}
                        
                        ${isSelected 
                            ? 'bg-indigo-600 text-white font-bold' 
                            : isAvailable 
                                ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40' 
                                : isCurrent ? 'text-slate-400' : 'text-slate-600'
                        }

                        ${!isAvailable && isCurrent ? 'cursor-not-allowed opacity-50' : ''}
                    `;
                    
                    return (
                        <div key={index} className="flex justify-center">
                            <button 
                                className={dayClasses}
                                onClick={() => isAvailable && onDateSelect(day)}
                                disabled={!isAvailable}
                            >
                                {/* **THE FIX:** Add a separate element for the "today" indicator */}
                                {today && (
                                    <span className="absolute -inset-0.5 rounded-full border-2 border-slate-500"></span>
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