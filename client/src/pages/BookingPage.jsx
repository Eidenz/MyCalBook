import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format, startOfToday, isSameMonth, startOfMonth } from 'date-fns';
import { useCalendar } from '../hooks/useCalendar';
import { Clock, MapPin, Calendar as CalendarIcon, ArrowLeft, Globe } from 'lucide-react';

import CalendarSelector from '../components/booking/CalendarSelector';
import TimeSlotPicker from '../components/booking/TimeSlotPicker';
import BookingForm from '../components/booking/BookingForm';

const BookingPage = () => {
    const { slug } = useParams();
    
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

    // Loading states
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
    const [error, setError] = useState('');

    // Track which months we've loaded to avoid duplicate requests
    const [loadedMonths, setLoadedMonths] = useState(new Set());
    const [bookingDetails, setBookingDetails] = useState(null);

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
        } catch (err) {
            throw new Error(err.message);
        }
    }, [slug, selectedDate]);

    const fetchMonthAvailability = useCallback(async (monthDate) => {
        const monthKey = format(startOfMonth(monthDate), 'yyyy-MM');
        
        // Skip if we've already loaded this month
        if (loadedMonths.has(monthKey)) {
            return;
        }

        try {
            const monthlyResponse = await fetch(`/api/public/availability/${slug}/month?month=${monthKey}`);
            if (!monthlyResponse.ok) throw new Error('Could not load monthly availability.');
            const monthlyData = await monthlyResponse.json();
            
            // Update availability data and mark month as loaded
            setMonthlyAvailability(prev => [...prev, ...(monthlyData.availableDays || [])]);
            setLoadedMonths(prev => new Set([...prev, monthKey]));
        } catch (err) {
            console.error('Error fetching month data:', err);
        }
    }, [slug, loadedMonths]);

    const fetchDailySlots = useCallback(async () => {
        if (!selectedDate || !selectedDuration) return;
        
        setIsLoadingSlots(true);
        setDailySlots([]); 
        setSelectedTime(null); 
        
        try {
            const dateQuery = format(selectedDate, 'yyyy-MM-dd');
            const response = await fetch(`/api/public/availability/${slug}?date=${dateQuery}&duration=${selectedDuration}`);
            if (!response.ok) throw new Error('Could not load slots for this day.');
            const data = await response.json();
            setDailySlots(data.availableSlots || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingSlots(false);
        }
    }, [slug, selectedDate, selectedDuration]);

    // Initial load - only runs once
    useEffect(() => {
        const initializeBookingPage = async () => {
            setIsInitialLoading(true);
            setError('');
            
            try {
                // Fetch event type first
                await fetchEventType();
                
                // Fetch initial month availability
                await fetchMonthAvailability(selectedDate);
                
            } catch (err) {
                setError(err.message);
            } finally {
                setIsInitialLoading(false);
            }
        };

        initializeBookingPage();
    }, [slug]); // Only depend on slug, not on selectedDate or other changing values

    // Fetch daily slots when date or duration changes (but only after initial load)
    useEffect(() => {
        if (!isInitialLoading && eventType) {
            fetchDailySlots();
        }
    }, [fetchDailySlots, isInitialLoading, eventType]);

    // Set user timezone
    useEffect(() => {
        setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }, []);

    // --- Handlers ---

    const handleDateSelect = async (day) => {
        // Check if we need to fetch new month data
        const currentMonth = startOfMonth(selectedDate);
        const newMonth = startOfMonth(day);
        
        if (!isSameMonth(currentMonth, newMonth)) {
            // Fetch month data without showing loading screen
            await fetchMonthAvailability(day);
        }
        
        // Update calendar and selected date
        calendar.setCurrentMonth(day);
        setSelectedDate(day);
        setSelectedTime(null);
    };

    const handleClearTimeSelection = () => {
        setSelectedTime(null);
    };
    
    const handleConfirmBooking = async (bookingDetails) => {
        setBookingDetails(bookingDetails);
        try {
            const response = await fetch('/api/public/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventTypeSlug: slug,
                    startTime: selectedTime,
                    duration: selectedDuration,
                    ...bookingDetails,
                }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to confirm booking.');
            }
            setIsBookingConfirmed(true);
        } catch (err) {
            throw err;
        }
    };

    // --- Render Logic ---

    if (isInitialLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mb-4"></div>
                    <p className="text-slate-300">Loading booking page...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center text-red-400 p-8">
                    <p className="text-xl mb-4">⚠️ {error}</p>
                    <Link to="/" className="text-indigo-400 hover:text-indigo-300 underline">
                        Go back to home
                    </Link>
                </div>
            </div>
        );
    }

    if (isBookingConfirmed) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center p-8 bg-slate-800 rounded-lg max-w-md transform transition-all duration-300 scale-100">
                    <div className="text-6xl mb-4">🎉</div>
                    <h1 className="text-2xl font-bold text-green-400 mb-2">Booking Confirmed!</h1>
                    <p className="text-slate-300 mb-6">
                        {bookingDetails?.email
                            ? 'A calendar invitation and confirmation has been sent to your email address.'
                            : 'Your event is scheduled. Thank you!'}
                    </p>
                    <Link 
                        to={`/`} 
                        className="inline-block w-full py-3 bg-indigo-600 rounded-lg font-semibold text-white hover:bg-indigo-700 transition-colors duration-200"
                    >
                        Done
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col lg:items-center lg:justify-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-7xl mx-auto bg-slate-800/50 border border-slate-700 rounded-2xl shadow-2xl flex flex-col lg:flex-row lg:h-[750px] transform transition-all duration-300">
                
                {/* Left Pane: Event Info (always visible) */}
                <div className="p-8 border-b lg:border-r lg:border-b-0 border-slate-700 flex flex-col lg:w-[30%] lg:flex-shrink-0">
                    {/* Back button for mobile when form is open */}
                    {selectedTime && (
                        <button 
                            onClick={handleClearTimeSelection} 
                            className="flex lg:hidden items-center gap-2 text-indigo-400 mb-4 -ml-1 hover:text-indigo-300 transition-colors duration-200"
                        >
                            <ArrowLeft size={16} /> Back to time selection
                        </button>
                    )}
                    <p className="text-slate-400">{eventType?.ownerUsername}</p>
                    <h1 className="text-3xl font-bold text-white my-2">{eventType?.title}</h1>
                    <div className="space-y-2 text-slate-300 mt-4">
                        <div className="flex items-center gap-3">
                            <Clock size={16} className="text-indigo-400"/>
                            <span>{selectedDuration || eventType?.default_duration} minutes</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin size={16} className="text-indigo-400"/>
                            <span>{eventType?.location}</span>
                        </div>
                    </div>
                    <p className="text-slate-400 mt-6 text-sm flex-grow">{eventType?.description}</p>

                    <div className="mt-6 pt-4 border-t border-slate-700">
                        <label htmlFor="interval" className="block text-sm font-semibold mb-2 text-slate-300">
                            Time slot interval to show
                        </label>
                        <select 
                            id="interval"
                            name="interval"
                            value={bookingInterval}
                            disabled={!!selectedTime}
                            onChange={(e) => setBookingInterval(parseInt(e.target.value, 10))}
                            className="w-full bg-slate-700 p-2.5 rounded-md border-2 border-slate-600 focus:border-indigo-500 focus:outline-none transition-colors duration-200 disabled:opacity-50"
                        >
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">60 minutes</option>
                        </select>
                    </div>
                </div>

                {/* Conditional Right Pane */}
                {selectedTime ? (
                    // Booking Form View
                    <div className="p-8 flex flex-col lg:w-[70%] lg:flex-1">
                        <div className="flex-grow flex flex-col items-center justify-center">
                            <div className="w-full max-w-sm text-center">
                                <h2 className="text-xl font-bold text-white mb-2">Confirm your booking</h2>
                                <div className="my-6 p-4 rounded-lg border-2 border-slate-600 bg-slate-900/50 flex items-center justify-center gap-3 transform transition-all duration-200 hover:border-indigo-500">
                                    <CalendarIcon className="text-indigo-400" size={20} />
                                    <span className="text-lg font-semibold text-slate-200">
                                        {format(new Date(selectedTime), 'HH:mm')}
                                    </span>
                                    <span className="text-lg text-slate-400">on</span>
                                    <span className="text-lg font-semibold text-slate-200">
                                        {format(new Date(selectedTime), 'EEEE, MMMM d')}
                                    </span>
                                </div>
                                <BookingForm 
                                    eventType={eventType}
                                    selectedTime={selectedTime}
                                    duration={selectedDuration}
                                    onConfirmBooking={handleConfirmBooking}
                                    onCancel={handleClearTimeSelection}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    // Calendar and Time Slots View
                    <div className="flex flex-col lg:flex-row lg:flex-1 min-h-0">
                        {/* Calendar Pane */}
                        <div className="p-8 border-b lg:border-r lg:border-b-0 border-slate-700 lg:w-1/2 flex flex-col justify-center">
                            <CalendarSelector 
                                hook={calendar} 
                                onDateSelect={handleDateSelect} 
                                selectedDate={selectedDate}
                                availableDays={monthlyAvailability}
                            />
                            <div className="mt-4 text-center">
                                <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-full">
                                    <Globe size={14}/>
                                    <span>Timezone: {userTimezone.replace(/_/g, ' ')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Time Slots Pane */}
                        <div className="p-8 flex flex-col lg:w-1/2">
                            <h2 className="font-semibold text-white mb-4 text-lg flex-shrink-0">
                                {format(selectedDate, 'EEEE, MMMM d')}
                            </h2>
                            <TimeSlotPicker 
                                durations={eventType?.durations || []}
                                selectedDuration={selectedDuration}
                                onSelectDuration={setSelectedDuration}
                                slots={dailySlots}
                                selectedTime={selectedTime}
                                onSelectTime={setSelectedTime}
                                isLoading={isLoadingSlots}
                                bookingInterval={bookingInterval}
                                selectedDate={selectedDate}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingPage;