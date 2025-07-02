import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Plus, Calendar, LogOut } from 'lucide-react';
import { useCalendar } from '../hooks/useCalendar';
import { format, startOfMonth, endOfWeek, startOfWeek, isSameDay } from 'date-fns';
import MonthView from '../components/calendar/MonthView';
import TimeGridView from '../components/calendar/TimeGridView';
import EventModal from '../components/calendar/EventModal';
import DayViewModal from '../components/calendar/DayViewModal';

const CalendarView = () => {
    const { token, logout } = useAuth();
    const [view, setView] = useState('month'); // 'month', 'week', 'day'
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
    
    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
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

        if (token) {
            fetchEvents();
        }
    }, [currentDate, token, logout]);

    const handleOpenModal = (event = null) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);
    const handleEventCreated = (newEvent) => setEvents(p => [...p, newEvent]);
    const handleEventDeleted = (eventId) => setEvents(p => p.filter(e => e.id !== eventId));
    const handleEventUpdated = (updatedEvent) => setEvents(p => p.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    const handleOpenDayView = (day, events) => {
        setDayViewData({ day, events });
        setIsDayViewModalOpen(true);
    };
    const handleCloseDayView = () => setIsDayViewModalOpen(false);

    const handlePrev = () => {
        if (view === 'month') prevMonth();
        if (view === 'week') prevWeek();
        if (view === 'day') prevDay();
    };
    const handleNext = () => {
        if (view === 'month') nextMonth();
        if (view === 'week') nextWeek();
        if (view === 'day') nextDay();
    };

    const getTitle = () => {
        if (view === 'month') return format(currentDate, 'MMMM yyyy');
        if (view === 'week') {
            const start = daysForWeekView[0];
            const end = daysForWeekView[6];
            return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
        }
        if (view === 'day') return format(currentDate, 'MMMM d, yyyy');
        return '';
    };

    // Responsive weekday labels
    const weekDays = isMobile 
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const ViewSwitcher = () => (
        <div className="flex items-center bg-slate-700/50 p-1 rounded-lg">
            {['month', 'week', 'day'].map(v => (
                <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-2 md:px-3 py-1 text-xs md:text-sm font-semibold rounded-md transition-colors capitalize ${
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
            <header className="flex justify-between items-center pb-2 md:pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-1 md:gap-2">
                    <button onClick={goToToday} className="px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm font-semibold border border-slate-600 rounded-lg hover:bg-slate-700 transition">Today</button>
                    <button onClick={handlePrev} className="p-1 md:p-2 rounded-md hover:bg-slate-700 transition"><ChevronLeft size={isMobile ? 16 : 20} /></button>
                    <button onClick={handleNext} className="p-1 md:p-2 rounded-md hover:bg-slate-700 transition"><ChevronRight size={isMobile ? 16 : 20} /></button>
                    <span className="text-sm md:text-lg font-semibold w-32 md:w-48 text-left ml-1 md:ml-2">{getTitle()}</span>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <ViewSwitcher />
                    <button onClick={() => handleOpenModal(null)} className="flex items-center gap-1 md:gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-2 md:px-4 py-1 md:py-2 rounded-lg hover:opacity-90 transition">
                        <Plus size={isMobile ? 16 : 18} /> 
                        <span className="hidden sm:inline text-xs md:text-sm">Add Event</span>
                    </button>
                </div>
            </header>
            
            <main className="flex-1 bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-indigo-500"></div>
                            <span className="text-xs md:text-sm">Loading events...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {view === 'month' && (
                            <>
                                <div className="grid grid-cols-7 bg-slate-900/50 border-b border-slate-700">
                                    {weekDays.map(day => (
                                        <div key={day} className="p-1 md:p-3 text-center font-semibold text-xs md:text-sm text-slate-400">
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                <MonthView 
                                    days={daysForMonthView} 
                                    month={startOfMonth(currentDate)} 
                                    events={events}
                                    onEventClick={handleOpenModal}
                                    onShowMoreClick={handleOpenDayView}
                                />
                            </>
                        )}
                        {view === 'week' && <TimeGridView days={daysForWeekView} events={events} onEventClick={handleOpenModal} />}
                        {view === 'day' && <TimeGridView days={[dayForDayView]} events={events} onEventClick={handleOpenModal} />}
                    </>
                )}
            </main>

            <EventModal isOpen={isModalOpen} onClose={handleCloseModal} onEventCreated={handleEventCreated} onEventDeleted={handleEventDeleted} onEventUpdated={handleEventUpdated} selectedEvent={selectedEvent} token={token} />
            <DayViewModal isOpen={isDayViewModalOpen} onClose={handleCloseDayView} day={dayViewData.day} events={dayViewData.events} onEventClick={handleOpenModal} />
        </div>
    );
};

export default CalendarView;