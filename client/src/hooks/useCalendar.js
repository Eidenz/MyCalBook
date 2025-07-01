import { useState } from 'react';
import { 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    addMonths, 
    subMonths, 
    format 
} from 'date-fns';

export const useCalendar = (initialDate = new Date()) => {
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialDate));

    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);

    // Get the first day of the week for the first week of the month (might be in the previous month)
    const startDate = startOfWeek(firstDayOfMonth);
    // Get the last day of the week for the last week of the month (might be in the next month)
    const endDate = endOfWeek(lastDayOfMonth);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToToday = () => setCurrentMonth(startOfMonth(new Date()));

    return {
        currentMonth,
        days,
        nextMonth,
        prevMonth,
        goToToday,
        setCurrentMonth: (date) => setCurrentMonth(startOfMonth(date)),
        monthName: format(currentMonth, 'MMMM yyyy'),
    };
};