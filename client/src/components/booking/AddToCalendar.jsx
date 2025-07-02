import React from 'react';
import { format } from 'date-fns';
import { Calendar, Download } from 'lucide-react';

// A helper to format dates for Google/ICS (YYYYMMDDTHHMMSSZ)
const formatUtcDateTime = (date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
};

const AddToCalendar = ({ event }) => {
    if (!event) return null;

    const { title, start_time, end_time, description, location } = event;
    const start = new Date(start_time);
    const end = new Date(end_time);

    // --- Generate Links ---

    // Google Calendar
    const googleLink = new URL('https://www.google.com/calendar/render');
    googleLink.searchParams.append('action', 'TEMPLATE');
    googleLink.searchParams.append('text', title);
    googleLink.searchParams.append('dates', `${formatUtcDateTime(start)}/${formatUtcDateTime(end)}`);
    googleLink.searchParams.append('details', description || '');
    googleLink.searchParams.append('location', location || '');

    // Outlook Calendar
    const outlookLink = new URL('https://outlook.office.com/calendar/0/deeplink/compose');
    outlookLink.searchParams.append('path', '/calendar/action/compose');
    outlookLink.searchParams.append('rru', 'addevent');
    outlookLink.searchParams.append('subject', title);
    outlookLink.searchParams.append('startdt', start.toISOString());
    outlookLink.searchParams.append('enddt', end.toISOString());
    outlookLink.searchParams.append('body', description || '');
    outlookLink.searchParams.append('location', location || '');


    // --- .ics File Generation ---

    const generateIcsContent = () => {
        // A unique identifier for the event
        const uid = `${event.id}@mycalbook.com`; 
        // Escape newlines in description for ICS format
        const icsDescription = (description || '').replace(/\n/g, '\\n');

        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//MyCalBook//App v1.0//EN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${formatUtcDateTime(new Date())}`,
            `DTSTART:${formatUtcDateTime(start)}`,
            `DTEND:${formatUtcDateTime(end)}`,
            `SUMMARY:${title}`,
            `DESCRIPTION:${icsDescription}`,
            `LOCATION:${location || ''}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
    };

    const handleDownloadIcs = () => {
        const icsContent = generateIcsContent();
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${title.replace(/ /g, '_')}.ics`);
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const calendarLinks = [
        { name: 'Google Calendar', href: googleLink.href },
        { name: 'Outlook Calendar', href: outlookLink.href },
    ];

    return (
        <div className="w-full max-w-sm mx-auto mt-6 space-y-3">
            <h3 className="text-center font-semibold text-slate-300">Add to your calendar:</h3>
            
            {calendarLinks.map(link => (
                <a 
                    key={link.name} 
                    href={link.href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-center gap-3 w-full py-3 bg-slate-700/80 rounded-lg font-semibold text-white hover:bg-slate-700 transition-colors duration-200 border border-slate-600"
                >
                    <Calendar size={18} />
                    {link.name}
                </a>
            ))}
            
            <button
                onClick={handleDownloadIcs}
                className="flex items-center justify-center gap-3 w-full py-3 bg-slate-700/80 rounded-lg font-semibold text-white hover:bg-slate-700 transition-colors duration-200 border border-slate-600"
            >
                <Download size={18} />
                Download (.ics file)
            </button>
        </div>
    );
};

export default AddToCalendar;