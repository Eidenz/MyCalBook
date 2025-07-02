import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Plus, LogOut, Calendar } from 'lucide-react';
import { useCalendar } from '../hooks/useCalendar';
import { format } from 'date-fns';
import CalendarGrid from '../components/calendar/CalendarGrid';
import EventModal from '../components/calendar/EventModal';
import DayViewModal from '../components/calendar/DayViewModal';

const CalendarView = () => {
    const { token, logout, user } = useAuth();
    const { currentMonth, days, nextMonth, prevMonth, monthName } = useCalendar();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null); 
    const [isDayViewModalOpen, setIsDayViewModalOpen] = useState(false);
    const [dayViewData, setDayViewData] = useState({ day: null, events: [] });
    const [showLegend, setShowLegend] = useState(false);

    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            const monthQuery = format(currentMonth, 'yyyy-MM');
            try {
                // Add the token to the request headers
                const response = await fetch(`/api/events/manual?month=${monthQuery}`, {
                    headers: { 'x-auth-token': token }
                });
                if (response.status === 401) { // If token is invalid/expired
                    logout();
                    return;
                }
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setEvents(data);
            } catch (error) {
                console.error("Failed to fetch events:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (token) { // Only fetch if token exists
            fetchEvents();
        }
    }, [currentMonth, token, logout]);

    const handleOpenModal = (event = null) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedEvent(null);
    };

    const handleEventCreated = (newEvent) => {
        setEvents(prevEvents => [...prevEvents, newEvent]);
    };

    const handleEventDeleted = (eventId) => {
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
    };

    const handleEventUpdated = (updatedEvent) => {
        setEvents(prevEvents => 
            prevEvents.map(event => 
                event.id === updatedEvent.id ? updatedEvent : event
            )
        );
    };

    const handleOpenDayView = (day, events) => {
        setDayViewData({ day, events });
        setIsDayViewModalOpen(true);
    };

    const handleCloseDayView = () => {
        setIsDayViewModalOpen(false);
    };

    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekDaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="flex flex-col h-[calc(100vh-65px)] p-3 md:p-6">
            {/* Mobile Header */}
            <div className="md:hidden">
                {/* Top row - Navigation and month */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={prevMonth} 
                            className="p-2 rounded-md hover:bg-slate-700 transition-colors active:scale-95"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-lg font-semibold min-w-[120px] text-center">{monthName}</span>
                        <button 
                            onClick={nextMonth} 
                            className="p-2 rounded-md hover:bg-slate-700 transition-colors active:scale-95"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <button
                        onClick={() => setShowLegend(!showLegend)}
                        className="p-2 rounded-md hover:bg-slate-700 transition-colors active:scale-95"
                    >
                        <Calendar size={20} />
                    </button>
                </div>

                {/* Legend (collapsible on mobile) */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showLegend ? 'max-h-20 opacity-100 mb-3' : 'max-h-0 opacity-0'}`}>
                    <div className="flex justify-center items-center gap-4 p-2 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            <span className="text-xs text-slate-400">Booked</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                            <span className="text-xs text-slate-400">Personal</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500"></span>
                            <span className="text-xs text-slate-400">Blocked</span>
                        </div>
                    </div>
                </div>

                {/* Add Event Button */}
                <button 
                    onClick={() => handleOpenModal(null)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-4 py-3 rounded-lg hover:opacity-90 transition-all active:scale-95 mb-4"
                >
                    <Plus size={18} /> Add Event
                </button>
            </div>

            {/* Desktop Header */}
            <header className="hidden md:flex justify-between items-center pb-3">
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 rounded-md hover:bg-slate-700 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-lg font-semibold w-36 text-center">{monthName}</span>
                    <button onClick={nextMonth} className="p-2 rounded-md hover:bg-slate-700 transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
                {/* Calendar Legend */}
                <div className="flex justify-center items-center gap-6 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span className="text-xs text-slate-400">Booked</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                        <span className="text-xs text-slate-400">Personal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span className="text-xs text-slate-400">Blocked</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => handleOpenModal(null)}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                        <Plus size={18} /> Add Event
                    </button>
                </div>
            </header>

            {/* Main Calendar Section */}
            <main className="flex-1 bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col">
                {/* Week Day Headers */}
                <div className="grid grid-cols-7 bg-slate-900/50 border-b border-slate-700">
                    {/* Show full names on desktop, short names on mobile */}
                    {weekDays.map((day, index) => (
                        <div key={day} className="p-2 md:p-3 text-center font-semibold text-xs md:text-sm text-slate-400">
                            <span className="hidden md:inline">{day}</span>
                            <span className="md:hidden">{weekDaysShort[index]}</span>
                        </div>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            <span>Loading events...</span>
                        </div>
                    </div>
                ) : (
                    <CalendarGrid 
                        days={days} 
                        month={currentMonth} 
                        events={events}
                        onEventClick={handleOpenModal}
                        onShowMoreClick={handleOpenDayView}
                    />
                )}
            </main>

            <EventModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onEventCreated={handleEventCreated}
                onEventDeleted={handleEventDeleted}
                onEventUpdated={handleEventUpdated}
                selectedEvent={selectedEvent}
                token={token}
            />

            <DayViewModal 
                isOpen={isDayViewModalOpen}
                onClose={handleCloseDayView}
                day={dayViewData.day}
                events={dayViewData.events}
                onEventClick={handleOpenModal}
            />
        </div>
    );
};

export default CalendarView;