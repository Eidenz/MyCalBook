import React, { useMemo, useState, useEffect } from 'react';
import { format, getMinutes, isToday } from 'date-fns';

const TimeSlotPicker = ({ 
    durations, 
    selectedDuration, 
    onSelectDuration,
    slots,
    selectedTime,
    onSelectTime,
    isLoading,
    bookingInterval,
    selectedDate
}) => {
    const [showSlots, setShowSlots] = useState(false);
    const [previousSlots, setPreviousSlots] = useState([]);

    const filteredSlots = useMemo(() => {
        const now = new Date();
        const isSelectedDateToday = selectedDate && isToday(selectedDate);

        return slots.filter(slot => {
            const slotDate = new Date(slot);

            // If the selected date is today, we must check if the time has passed.
            if (isSelectedDateToday) {
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const slotHour = slotDate.getHours();
                const slotMinute = slotDate.getMinutes();

                // If the slot's hour is before now, or if it's the same hour but an earlier minute, filter it out.
                if (slotHour < currentHour || (slotHour === currentHour && slotMinute < currentMinute)) {
                    return false; // This slot is in the past.
                }
            }
            
            // Filter by the selected time slot interval (e.g., show only every 30 mins).
            if (bookingInterval && getMinutes(slotDate) % bookingInterval !== 0) {
                return false;
            }
            
            return true;
        });
    }, [slots, bookingInterval, selectedDate]);

    // Handle smooth transitions when slots change
    useEffect(() => {
        if (isLoading) {
            setShowSlots(false);
        } else {
            // Small delay to allow fade out, then show new slots
            const timer = setTimeout(() => {
                setPreviousSlots(filteredSlots);
                setShowSlots(true);
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isLoading, filteredSlots]);

    // Reset animation when loading starts
    useEffect(() => {
        if (isLoading) {
            setShowSlots(false);
        }
    }, [isLoading]);

    return (
        <div className="flex flex-col flex-auto min-h-0">
            {/* Duration Selector - with smooth transitions */}
            <div className="flex-shrink-0">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Select Duration</h3>
                <div className="grid grid-cols-2 gap-2">
                    {durations.map((duration, index) => (
                        <button 
                            key={duration}
                            onClick={() => onSelectDuration(duration)}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className={`p-2 text-center rounded-lg border-2 transition-all duration-200 text-sm font-medium transform hover:scale-105 animate-fade-in-up
                                ${selectedDuration === duration 
                                    ? 'bg-indigo-600 border-indigo-600 text-slate-900 dark:text-white shadow-lg shadow-indigo-500/25'
                                    : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 hover:bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50'
                                }
                            `}
                        >
                            {duration} min
                        </button>
                    ))}
                </div>
            </div>

            <div className="border-t border-slate-300 dark:border-slate-700 my-4 flex-shrink-0"></div>

            <div className="flex-auto min-h-0 overflow-y-auto pr-2">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2 sticky top-0 bg-slate-100 dark:bg-slate-800 py-1 z-10">Available Times</h3>
                
                <div className="relative min-h-[100px]">
                    {/* Loading State */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                        isLoading ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                    }`}>
                        <div className="text-center">
                            <div className="inline-flex items-center gap-3 text-slate-400 dark:text-slate-500 dark:text-slate-400">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                                </div>
                                <span className="animate-pulse">Finding available slots...</span>
                            </div>
                        </div>
                    </div>

                    {/* Slots Grid */}
                    <div className={`transition-all duration-300 ${
                        showSlots && !isLoading ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
                    }`}>
                        {filteredSlots.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                                {filteredSlots.map((slot, index) => (
                                    <button
                                        key={`${slot}-${index}`}
                                        onClick={() => onSelectTime(slot)}
                                        style={{ 
                                            animationDelay: `${index * 50}ms`,
                                            transitionDelay: `${index * 25}ms`
                                        }}
                                        className={`slot-button p-2.5 w-full text-center rounded-lg border-2 transition-all duration-200 font-semibold transform hover:scale-105 hover:-translate-y-0.5
                                            ${selectedTime === slot 
                                                ? 'bg-indigo-600 border-indigo-600 text-slate-900 dark:text-white shadow-lg shadow-indigo-500/25'
                                                : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 hover:bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50 hover:shadow-md'
                                            }
                                            ${showSlots ? 'animate-slide-in-up' : ''}
                                        `}
                                    >
                                        {format(new Date(slot), 'HH:mm')}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className={`text-center py-8 transition-all duration-300 ${
                                showSlots ? 'animate-fade-in' : ''
                            }`}>
                                <div className="text-6xl mb-2 opacity-50">📅</div>
                                <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400">No available slots for this day.</p>
                                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Try selecting a different date</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeSlotPicker;