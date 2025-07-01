import React, { useMemo } from 'react';
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

    return (
        // This component is now a flex column that will take up the remaining space
        <div className="flex flex-col flex-auto min-h-0">
            {/* Duration Selector - flex-shrink-0 prevents this part from shrinking */}
            <div className="flex-shrink-0">
                <h3 className="font-semibold text-white mb-2">Select Duration</h3>
                <div className="grid grid-cols-2 gap-2">
                    {durations.map(duration => (
                        <button 
                            key={duration}
                            onClick={() => onSelectDuration(duration)}
                            className={`p-2 text-center rounded-lg border-2 transition-colors text-sm font-medium
                                ${selectedDuration === duration 
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-slate-600 hover:border-indigo-500 hover:bg-slate-700/50'
                                }
                            `}
                        >
                            {duration} min
                        </button>
                    ))}
                </div>
            </div>

            <div className="border-t border-slate-700 my-4 flex-shrink-0"></div>

            <div className="flex-auto min-h-0 overflow-y-auto pr-2">
                <h3 className="font-semibold text-white mb-2 sticky top-0 bg-slate-800 py-1 z-10">Available Times</h3>
                {isLoading ? (
                    <div className="text-center text-slate-400">Finding available slots...</div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {filteredSlots.length > 0 ? (
                            filteredSlots.map(slot => (
                                <button
                                    key={slot}
                                    onClick={() => onSelectTime(slot)}
                                    className={`p-2.5 w-full text-center rounded-lg border-2 transition-colors font-semibold
                                        ${selectedTime === slot 
                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                            : 'border-slate-600 hover:border-indigo-500'
                                        }
                                    `}
                                >
                                    {format(new Date(slot), 'HH:mm')}
                                </button>
                            ))
                        ) : (
                            <p className="text-slate-400 text-center py-4">No available slots for this day.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimeSlotPicker;