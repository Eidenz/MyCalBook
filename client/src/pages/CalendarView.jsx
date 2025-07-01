import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Plus, LogOut } from 'lucide-react';
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

    return (
        <div className="flex flex-col h-[calc(100vh-65px)] p-6">
            {/* Page-specific header (Add Event button, etc.) */}
            <header className="flex justify-between items-center pb-4">
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 rounded-md hover:bg-slate-700 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-lg font-semibold w-36 text-center">{monthName}</span>
                    <button onClick={nextMonth} className="p-2 rounded-md hover:bg-slate-700 transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => handleOpenModal(null)}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                        <Plus size={18} /> Add Event
                    </button>
                    <div className="flex bg-slate-700 p-1 rounded-lg">
                        <button className="px-3 py-1 text-sm font-semibold bg-indigo-600 rounded-md shadow">Month</button>
                        <button className="px-3 py-1 text-sm text-slate-300 hover:bg-slate-600 rounded-md">Week</button>
                        <button className="px-3 py-1 text-sm text-slate-300 hover:bg-slate-600 rounded-md">Day</button>
                    </div>
                </div>
            </header>

            {/* Main Calendar Section */}
            <main className="flex-1 bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col">
                <div className="grid grid-cols-7 bg-slate-900/50 border-b border-slate-700">
                    {weekDays.map(day => (
                        <div key={day} className="p-3 text-center font-semibold text-sm text-slate-400">
                            {day}
                        </div>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400">Loading events...</div>
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