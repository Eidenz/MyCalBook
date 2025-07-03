import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useCalendar } from '../hooks/useCalendar';
import { format, startOfMonth } from 'date-fns';
import MonthView from '../components/calendar/MonthView';
import TimeGridView from '../components/calendar/TimeGridView';
import EventModal from '../components/calendar/EventModal';
import DayViewModal from '../components/calendar/DayViewModal';

const CalendarLegend = () => (
    <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 mb-2 md:mb-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
            <span>Personal</span>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <span>Blocked</span>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
            <span>Past Event</span>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-slate-800 ring-sky-400"></div>
            <span>Current Event</span>
        </div>
    </div>
);


const CalendarView = () => {
    const { token, logout } = useAuth();
    // Load view from localStorage or default to 'month'
    const [view, setView] = useState(() => localStorage.getItem('calendarView') || 'month');
    
    const { 
        currentDate,
        daysForMonthView, nextMonth, prevMonth,
        daysForWeekView, nextWeek, prevWeek,
        dayForDayView, nextDay, prevDay,
        goToToday
    } = useCalendar();

    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null); 
    const [isDayViewModalOpen, setIsDayViewModalOpen] = useState(false);
    const [dayViewData, setDayViewData] = useState({ day: null, events: [] });
    const [isMobile, setIsMobile] = useState(false);

    // Save view to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('calendarView', view);
    }, [view]);
    
    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const fetchEvents = async () => {
        setIsLoading(true);
        const monthQuery = format(currentDate, 'yyyy-MM');
        try {
            const response = await fetch(`/api/events/manual?month=${monthQuery}`, {
                headers: { 'x-auth-token': token }
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            setEvents(data);
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (token) {
            fetchEvents();
        }
    }, [currentDate, token]);

    const handleOpenModal = (event = null, date = null) => {
        const eventWithDate = event ? event : { start_time: date, end_time: date };
        setSelectedEvent(eventWithDate);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        fetchEvents(); // Refetch events after modal closes
    };

    const handleRefreshCalendar = () => {
        fetchEvents();
    };
    
    const handleOpenDayView = (day, events) => {
        setDayViewData({ day, events });
        setIsDayViewModalOpen(true);
    };

    const handlePrev = () => {
        if (view === 'month') prevMonth();
        else if (view === 'week') prevWeek();
        else prevDay();
    };
    const handleNext = () => {
        if (view === 'month') nextMonth();
        else if (view === 'week') nextWeek();
        else nextDay();
    };

    const getTitle = () => {
        if (view === 'month') return format(currentDate, 'MMMM yyyy');
        if (view === 'week') {
            const start = daysForWeekView[0];
            const end = daysForWeekView[6];
            return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
        }
        return format(currentDate, 'MMMM d, yyyy');
    };

    const weekDays = isMobile 
        ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const ViewSwitcher = () => (
        <div className="flex items-center bg-slate-700/50 p-1 rounded-lg">
            {['month', 'week', 'day'].map(v => (
                <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors capitalize ${
                        view === v ? 'bg-slate-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                >
                    {v}
                </button>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-65px)] p-2 md:p-6">
            <header className="pb-3 md:pb-4">
                {/* Desktop layout */}
                <div className="hidden md:flex md:justify-between md:items-center md:gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={goToToday} className="px-4 py-2 text-sm font-semibold border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors">Today</button>
                        <div className="flex items-center bg-slate-700/50 rounded-lg p-1">
                            <button onClick={handlePrev} className="p-2 rounded-md hover:bg-slate-600 transition-colors" aria-label="Previous"><ChevronLeft size={20} /></button>
                            <button onClick={handleNext} className="p-2 rounded-md hover:bg-slate-600 transition-colors" aria-label="Next"><ChevronRight size={20} /></button>
                        </div>
                        <h1 className="text-2xl font-bold text-white ml-2">{getTitle()}</h1>
                    </div>
                    <CalendarLegend />
                    <div className="flex items-center gap-4">
                        <ViewSwitcher />
                        <button onClick={() => handleOpenModal(null, currentDate)} className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-all"><Plus size={18} /> <span className="text-sm">Add Event</span></button>
                    </div>
                </div>

                {/* Mobile layout */}
                <div className="md:hidden space-y-4">
                    <div className="flex items-center gap-3">
                        <button onClick={goToToday} className="px-3 py-2 text-sm font-semibold border border-slate-600 rounded-lg hover:bg-slate-700"><ChevronLeft size={16} className="inline-block" /><span className="ml-1">Today</span></button>
                        <h1 className="text-xl font-bold text-white flex-1 truncate">{getTitle()}</h1>
                        <div className="flex items-center bg-slate-700/50 rounded-lg p-1">
                            <button onClick={handlePrev} className="p-2 rounded-md hover:bg-slate-600" aria-label="Previous"><ChevronLeft size={20} /></button>
                            <button onClick={handleNext} className="p-2 rounded-md hover:bg-slate-600" aria-label="Next"><ChevronRight size={20} /></button>
                        </div>
                    </div>
                    <CalendarLegend />
                    <div className="flex items-center justify-between gap-3">
                        <ViewSwitcher />
                        <button onClick={() => handleOpenModal(null, currentDate)} className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-4 py-2.5 rounded-lg"><Plus size={18} /> <span className="text-sm">Add Event</span></button>
                    </div>
                </div>
            </header>

            <main className="flex-1 bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
                ) : (
                    <>
                        <div className="grid grid-cols-7 bg-slate-900/50 border-b border-slate-700">
                            {weekDays.map(day => <div key={day} className="p-1 md:p-3 text-center font-semibold text-xs md:text-sm text-slate-400">{day}</div>)}
                        </div>
                        {view === 'month' && <MonthView days={daysForMonthView} month={startOfMonth(currentDate)} events={events} onEventClick={handleOpenModal} onShowMoreClick={handleOpenDayView}/>}
                        {view === 'week' && <TimeGridView days={daysForWeekView} events={events} onEventClick={handleOpenModal} />}
                        {view === 'day' && <TimeGridView days={[dayForDayView]} events={events} onEventClick={handleOpenModal} />}
                    </>
                )}
            </main>

            <EventModal isOpen={isModalOpen} onClose={handleCloseModal} selectedEvent={selectedEvent} token={token} onRefresh={handleRefreshCalendar} />
            <DayViewModal isOpen={isDayViewModalOpen} onClose={() => setIsDayViewModalOpen(false)} day={dayViewData.day} events={dayViewData.events} onEventClick={handleOpenModal} />
        </div>
    );
};

export default CalendarView;