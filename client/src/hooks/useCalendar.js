import { useState } from 'react';
import { 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    addMonths, 
    subMonths, 
    format,
    addDays,
    subDays,
    addWeeks,
    subWeeks
} from 'date-fns';

export const useCalendar = (initialDate = new Date()) => {
    const [currentDate, setCurrentDate] = useState(initialDate);

    // --- Data for Month View ---
    const startOfMonthDate = startOfMonth(currentDate);
    const monthViewStartDate = startOfWeek(startOfMonthDate, { weekStartsOn: 0 }); // Sunday start
    const monthViewEndDate = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    const daysForMonthView = eachDayOfInterval({ start: monthViewStartDate, end: monthViewEndDate });

    // --- Data for Week View ---
    const startOfWeekDate = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start
    const endOfWeekDate = endOfWeek(currentDate, { weekStartsOn: 0 });
    const daysForWeekView = eachDayOfInterval({ start: startOfWeekDate, end: endOfWeekDate });

    // --- Data for Day View ---
    const dayForDayView = currentDate;

    // --- Navigation Functions ---
    const nextMonth = () => setCurrentDate(current => addMonths(current, 1));
    const prevMonth = () => setCurrentDate(current => subMonths(current, 1));
    const nextWeek = () => setCurrentDate(current => addWeeks(current, 1));
    const prevWeek = () => setCurrentDate(current => subWeeks(current, 1));
    const nextDay = () => setCurrentDate(current => addDays(current, 1));
    const prevDay = () => setCurrentDate(current => subDays(current, 1));
    const goToToday = () => setCurrentDate(new Date());

    return {
        currentDate,
        setCurrentDate,
        // Month
        daysForMonthView,
        nextMonth,
        prevMonth,
        // Week
        daysForWeekView,
        nextWeek,
        prevWeek,
        // Day
        dayForDayView,
        nextDay,
        prevDay,
        // Common
        goToToday,
        days: daysForMonthView,
        currentMonth: startOfMonthDate,
        monthName: format(currentDate, 'MMMM yyyy'),
    };
};