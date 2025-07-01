import React from 'react';
import { format } from 'date-fns';

const EventPill = ({ event, onClick }) => { 
    // Define styles based on the event type from the database
    const typeStyles = {
        personal: 'bg-amber-500 hover:bg-amber-400',
        booked: 'bg-green-500 hover:bg-green-400',
        blocked: 'bg-red-500 hover:bg-red-400',
    };

    const pillClass = `
        text-white text-xs p-1 rounded-md mb-1 cursor-pointer 
        flex items-center gap-1.5
        truncate transition-colors duration-200
        ${typeStyles[event.type] || 'bg-blue-500 hover:bg-blue-400'}
    `;

    try {
        // Create Date objects from the ISO strings. This will correctly
        // adjust for the client's local timezone.
        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);

        // Format the times in 24-hour format (HH:mm)
        const startTime = format(startDate, 'HH:mm');
        const endTime = format(endDate, 'HH:mm');

        return (
            <div className={pillClass} onClick={() => onClick(event)}>
                <span className="font-semibold flex-shrink-0">{startTime}-{endTime}</span>
                <span className="truncate">{event.title}</span>
            </div>
        );
    } catch (error) {
        console.error("Error formatting event time:", event, error);
        // Render a fallback if the date is invalid
        return (
            <div className={`${pillClass} bg-gray-500`}>
                Invalid event data
            </div>
        );
    }
};

export default EventPill;