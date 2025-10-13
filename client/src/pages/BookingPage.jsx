import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format, startOfToday, isSameMonth, startOfMonth, addMonths, subMonths } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useCalendar } from '../hooks/useCalendar';
import { Clock, MapPin, Calendar as CalendarIcon, ArrowLeft, Globe, CheckCircle, PlusCircle, UserCheck, ChevronLeft } from 'lucide-react';

import CalendarSelector from '../components/booking/CalendarSelector';
import TimeSlotPicker from '../components/booking/TimeSlotPicker';
import BookingForm from '../components/booking/BookingForm';
import AddToCalendar from '../components/booking/AddToCalendar';

const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h${remainingMinutes}`;
};

const BookingPage = () => {
    const { slug } = useParams();
    const { user, isAuthenticated, token } = useAuth();

    // State for the core data
    const [eventType, setEventType] = useState(null);
    const [monthlyAvailability, setMonthlyAvailability] = useState([]);
    const [dailySlots, setDailySlots] = useState([]);

    // State for user selections
    const [selectedDate, setSelectedDate] = useState(startOfToday());
    const [selectedDuration, setSelectedDuration] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [bookingInterval, setBookingInterval] = useState(15);
    const [userTimezone, setUserTimezone] = useState('');

    // Loading & Confirmation states
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
    const [confirmedBooking, setConfirmedBooking] = useState(null);
    const [error, setError] = useState('');
    const [isAddingToInternal, setIsAddingToInternal] = useState(false);
    const [isAddedToInternal, setIsAddedToInternal] = useState(false);

    // Track which months we've loaded to avoid duplicate requests
    const [loadedMonths, setLoadedMonths] = useState(new Set());
    
    // Initialize calendar hook but don't let it control our data fetching
    const calendar = useCalendar(selectedDate);

    // --- Data Fetching ---
    const fetchEventType = useCallback(async () => {
        try {
            const eventTypeResponse = await fetch(`/api/public/availability/${slug}?date=${format(selectedDate, 'yyyy-MM-dd')}`);
            if (!eventTypeResponse.ok) throw new Error('Booking page not found.');
            const data = await eventTypeResponse.json();
            setEventType(data.eventType);
            setSelectedDuration(data.eventType.default_duration);
            return data.eventType;
        } catch (err) { throw new Error(err.message); }
    }, [slug, selectedDate]);

    const fetchMonthAvailability = useCallback(async (monthDate) => {
        const monthKey = format(startOfMonth(monthDate), 'yyyy-MM');
        if (loadedMonths.has(monthKey)) return;
        try {
            const monthlyResponse = await fetch(`/api/public/availability/${slug}/month?month=${monthKey}`);
            if (!monthlyResponse.ok) throw new Error('Could not load monthly availability.');
            const monthlyData = await monthlyResponse.json();

            // Convert day numbers to full date objects for this specific month
            const [year, month] = monthKey.split('-').map(Number);
            const datesForMonth = (monthlyData.availableDays || []).map(dayNum => {
                return new Date(Date.UTC(year, month - 1, dayNum));
            });

            setMonthlyAvailability(prev => [...prev, ...datesForMonth]);
            setLoadedMonths(prev => new Set([...prev, monthKey]));
        } catch (err) { console.error('Error fetching month data:', err); }
    }, [slug, loadedMonths]);

    const fetchDailySlots = useCallback(async () => {
        if (!selectedDate || !selectedDuration) return;
        setIsLoadingSlots(true); setDailySlots([]); setSelectedTime(null);
        try {
            const dateQuery = format(selectedDate, 'yyyy-MM-dd');
            const response = await fetch(`/api/public/availability/${slug}?date=${dateQuery}&duration=${selectedDuration}`);
            if (!response.ok) throw new Error('Could not load slots for this day.');
            const data = await response.json();
            setDailySlots(data.availableSlots || []);
        } catch (err) { console.error(err); } 
        finally { setIsLoadingSlots(false); }
    }, [slug, selectedDate, selectedDuration]);

    useEffect(() => {
        const initializeBookingPage = async () => {
            setIsInitialLoading(true); setError('');
            try { await fetchEventType(); await fetchMonthAvailability(selectedDate); } 
            catch (err) { setError(err.message); } 
            finally { setIsInitialLoading(false); }
        };
        initializeBookingPage();
    }, [slug]);

    useEffect(() => { if (!isInitialLoading && eventType) { fetchDailySlots(); } }, [fetchDailySlots, isInitialLoading, eventType]);
    useEffect(() => { setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone); }, []);

    // --- Handlers ---
    const handleMonthChange = async (direction) => {
        // Calculate the new date before updating the calendar
        const newDate = direction === 'next'
            ? addMonths(calendar.currentDate, 1)
            : subMonths(calendar.currentDate, 1);

        // Update the calendar
        if (direction === 'next') {
            calendar.nextMonth();
        } else {
            calendar.prevMonth();
        }

        // Fetch availability for the new month
        await fetchMonthAvailability(newDate);
    };

    const handleDateSelect = async (day) => {
        const currentMonthKey = format(startOfMonth(selectedDate), 'yyyy-MM');
        const newMonthKey = format(startOfMonth(day), 'yyyy-MM');
        if (currentMonthKey !== newMonthKey) { await fetchMonthAvailability(day); }
        calendar.setCurrentDate(day); setSelectedDate(day); setSelectedTime(null);
    };

    const handleClearTimeSelection = () => setSelectedTime(null);
    
    const handleConfirmBooking = async (bookingDetails) => {
        try {
            // Construct the correct UTC timestamp from selectedDate and selectedTime
            const selectedTimeObj = new Date(selectedTime);
            const hours = selectedTimeObj.getHours();
            const minutes = selectedTimeObj.getMinutes();
            
            // Create a new date using the selectedDate and the time from selectedTime
            const correctDateTime = new Date(selectedDate);
            correctDateTime.setHours(hours, minutes, 0, 0);
            
            const response = await fetch('/api/public/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventTypeSlug: slug, startTime: correctDateTime.toISOString(), duration: selectedDuration, ...bookingDetails }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to confirm booking.');
            }
            const data = await response.json();
            setConfirmedBooking({ ...data.booking, title: eventType.title, location: eventType.location, description: bookingDetails.notes });
            setIsBookingConfirmed(true);
        } catch (err) { throw err; }
    };

    const handleAddToInternalCalendar = async () => {
        if (!isAuthenticated || !confirmedBooking) return;
        setIsAddingToInternal(true);
        const cancellationLink = `${window.location.origin}/cancel/${confirmedBooking.cancellation_token}`;
        try {
            const payload = {
                title: `${eventType.title} with ${eventType.ownerUsername}`,
                start_time: confirmedBooking.start_time,
                end_time: confirmedBooking.end_time,
                type: 'booked', // Appear as a 'booked' event, not 'personal'
                description: `Booked via MyCalBook with ${eventType.ownerUsername}.\n\nNotes: ${confirmedBooking.notes || 'N/A'}\n\nManage this booking:\n${cancellationLink}`,
                booking_id: confirmedBooking.id,
                guests: confirmedBooking.guests ? JSON.parse(confirmedBooking.guests) : [],
            };
            const response = await fetch('/api/events/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error('Failed to add event to your calendar.');
            setIsAddedToInternal(true);
        } catch (error) { alert(error.message); } 
        finally { setIsAddingToInternal(false); }
    };

    // --- Render Logic ---
    if (isInitialLoading) {
        return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4"><div className="text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mb-4"></div><p className="text-slate-600 dark:text-slate-300">Loading booking page...</p></div></div>;
    }
    if (error) {
        return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4"><div className="text-center text-red-400 p-8"><p className="text-xl mb-4">⚠️ {error}</p><Link to="/" className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:text-indigo-300 underline">Go back to home</Link></div></div>;
    }

    if (isBookingConfirmed && confirmedBooking) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-lg p-6 sm:p-8 bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-2xl animate-fade-in-up">
                    <div className="text-center">
                        <CheckCircle className="mx-auto text-green-400 h-16 w-16" />
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-4">Booking Confirmed!</h1>
                        <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-2 px-4">{confirmedBooking.booker_email ? 'A calendar invitation and confirmation has been sent to your email.' : 'Your event is scheduled.'}</p>
                        <div className="mt-4 text-xs text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 max-w-xs mx-auto">
                            <p>Keep this link to manage your booking:</p>
                            <Link to={`/cancel/${confirmedBooking.cancellation_token}`} className="text-indigo-500 dark:text-indigo-400 hover:underline break-all">{`${window.location.origin}/cancel/${confirmedBooking.cancellation_token}`}</Link>
                        </div>
                    </div>

                    <div className="my-6 space-y-4 p-4 bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-700">
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">{confirmedBooking.title}</p>
                        <div className="text-slate-600 dark:text-slate-300 space-y-2">
                           <div className="flex items-center gap-3"><CalendarIcon size={16} className="text-indigo-500 dark:text-indigo-400"/><span>{format(new Date(confirmedBooking.start_time), 'EEEE, MMMM d, yyyy')}</span></div>
                           <div className="flex items-center gap-3"><Clock size={16} className="text-indigo-500 dark:text-indigo-400"/><span>{format(new Date(confirmedBooking.start_time), 'HH:mm')} - {format(new Date(confirmedBooking.end_time), 'HH:mm')}</span></div>
                           <div className="flex items-center gap-3"><MapPin size={16} className="text-indigo-500 dark:text-indigo-400"/><span>{confirmedBooking.location}</span></div>
                        </div>
                    </div>

                    {isAuthenticated && (
                        <div className="mb-4">
                            <button 
                                onClick={handleAddToInternalCalendar} 
                                disabled={isAddingToInternal || isAddedToInternal} 
                                className="w-full flex items-center justify-center gap-3 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isAddingToInternal ? <><div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>Adding...</> : isAddedToInternal ? <><CheckCircle size={20} />Added to your calendar!</> : <><PlusCircle size={20} />Add to MyCalBook Calendar</>}
                            </button>
                        </div>
                    )}

                    <AddToCalendar event={confirmedBooking} />
                    <div className="mt-8 text-center"><Link to={`/u/${eventType.ownerUsername}`} className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition">Book another event with {eventType.ownerUsername}</Link></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col lg:items-center lg:justify-center p-4 sm:p-6 md:p-8">
            {isAuthenticated && user ? (
                <div className="w-full max-w-7xl mx-auto mb-4">
                    <div className="bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg p-2 px-4 text-sm text-center text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2">
                        <UserCheck size={16} className="text-green-400" />
                        Logged in as <strong className="text-slate-900 dark:text-white">{user.username}</strong>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-7xl mx-auto mb-4">
                    <div className="bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg p-2 px-4 text-sm text-center text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2">
                        <UserCheck size={16} className="text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                        <Link to="/login" className="text-indigo-500 dark:text-indigo-400 hover:underline">Log in</Link> to save booking to your own calendar.
                    </div>
                </div>
            )}
            <div className="w-full max-w-7xl mx-auto bg-slate-100/50 dark:bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col lg:flex-row lg:h-[750px] transform transition-all duration-300">
                <div className="p-6 border-b lg:border-r lg:border-b-0 border-slate-300 dark:border-slate-700 flex flex-col lg:w-[30%] lg:flex-shrink-0">
                    <div className="flex-shrink-0 -ml-2 mb-4">
                        <Link 
                            to={`/u/${eventType?.ownerUsername}`} 
                            className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors p-2 rounded-lg"
                        >
                            <ChevronLeft size={20} />
                            <span className="font-semibold text-sm">All booking options</span>
                        </Link>
                    </div>

                    {selectedTime && (<button onClick={handleClearTimeSelection} className="flex lg:hidden items-center gap-2 text-indigo-500 dark:text-indigo-400 mb-4 -ml-1 hover:text-indigo-600 dark:text-indigo-300 transition-colors duration-200"><ArrowLeft size={16} /> Back</button>)}
                    
                    <div className="flex-grow min-h-0 overflow-y-auto pr-2 -mr-2">
                        <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400">{eventType?.ownerUsername}</p>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white my-2">{eventType?.title}</h1>
                        <div className="space-y-2 text-slate-600 dark:text-slate-300 mt-4">
                            <div className="flex items-center gap-3"><Clock size={16} className="text-indigo-500 dark:text-indigo-400"/><span>{formatDuration(selectedDuration || eventType?.default_duration)}</span></div>
                            <div className="flex items-center gap-3"><MapPin size={16} className="text-indigo-500 dark:text-indigo-400"/><span>{eventType?.location}</span></div>
                        </div>
                        <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-6 text-sm">{eventType?.description}</p>
                        
                        {eventType?.image_url && (
                             <div className="mt-6">
                                <img 
                                    src={eventType.image_url} 
                                    alt={eventType.title}
                                    className="w-full max-h-64 h-auto object-cover rounded-lg"
                                />
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-300 dark:border-slate-700 flex-shrink-0">
                        <label htmlFor="interval" className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">Time slot interval</label>
                        <select id="interval" name="interval" value={bookingInterval} disabled={!!selectedTime} onChange={(e) => setBookingInterval(parseInt(e.target.value, 10))} className="w-full bg-slate-200 dark:bg-slate-700 p-2.5 rounded-md border-2 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors duration-200 disabled:opacity-50">
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">60 minutes</option>
                        </select>
                    </div>
                </div>
                {selectedTime ? (
                    <div className="p-8 flex flex-col lg:w-[70%] lg:flex-1">
                        <div className="flex-grow flex flex-col items-center justify-center">
                            <div className="w-full max-w-sm text-center">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirm your booking</h2>
                                <div className="my-6 p-4 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center gap-3 transform transition-all duration-200 hover:border-indigo-500">
                                    <CalendarIcon className="text-indigo-500 dark:text-indigo-400" size={20} />
                                    <span className="text-lg font-semibold text-slate-900 dark:text-white">{format(new Date(selectedTime), 'HH:mm')}</span>
                                    <span className="text-lg text-slate-400 dark:text-slate-500 dark:text-slate-400">on</span>
                                    <span className="text-lg font-semibold text-slate-900 dark:text-white">{format(selectedDate, 'EEEE, MMMM d')}</span>
                                </div>
                                <BookingForm 
                                    eventType={eventType} 
                                    selectedTime={selectedTime} 
                                    selectedDate={selectedDate}
                                    duration={selectedDuration} 
                                    onConfirmBooking={handleConfirmBooking} 
                                    onCancel={handleClearTimeSelection} 
                                    loggedInUsername={isAuthenticated ? user.username : null} 
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row lg:flex-1 min-h-0">
                        <div className="p-8 border-b lg:border-r lg:border-b-0 border-slate-300 dark:border-slate-700 lg:w-1/2 flex flex-col justify-center"><CalendarSelector hook={calendar} onDateSelect={handleDateSelect} onMonthChange={handleMonthChange} selectedDate={selectedDate} availableDays={monthlyAvailability} /><div className="mt-4 text-center"><div className="inline-flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full"><Globe size={14}/><span>Timezone: {userTimezone.replace(/_/g, ' ')}</span></div></div></div>
                        <div className="p-8 flex flex-col lg:w-1/2"><h2 className="font-semibold text-slate-900 dark:text-white mb-4 text-lg flex-shrink-0">{format(selectedDate, 'EEEE, MMMM d')}</h2><TimeSlotPicker durations={eventType?.durations || []} selectedDuration={selectedDuration} onSelectDuration={setSelectedDuration} slots={dailySlots} selectedTime={selectedTime} onSelectTime={setSelectedTime} isLoading={isLoadingSlots} bookingInterval={bookingInterval} selectedDate={selectedDate} /></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingPage;