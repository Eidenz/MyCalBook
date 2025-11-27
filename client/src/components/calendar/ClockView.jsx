import React, { useMemo, useEffect, useState } from 'react';
import { format, getHours, getMinutes, differenceInMinutes, isToday } from 'date-fns';

const ClockView = ({ day, events = [], onEventClick }) => {
    // Detect dark mode
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const checkDarkMode = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };

        checkDarkMode();

        // Watch for theme changes
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    // Update current time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, []);

    const clockData = useMemo(() => {
        // Filter events for this specific day and exclude all-day events from the clock
        const dayEvents = events.filter(event => {
            const eventDate = format(new Date(event.start_time), 'yyyy-MM-dd');
            const targetDate = format(day, 'yyyy-MM-dd');
            return eventDate === targetDate && !event.is_all_day && event.type !== 'birthday';
        });

        // Calculate total scheduled time (only for events with end times)
        let totalMinutes = 0;
        dayEvents.forEach(event => {
            if (event.end_time) {
                const start = new Date(event.start_time);
                const end = new Date(event.end_time);
                totalMinutes += differenceInMinutes(end, start);
            }
        });

        // Group events by type for summary (only count duration for events with end times)
        const eventsByType = dayEvents.reduce((acc, event) => {
            if (!acc[event.type]) {
                acc[event.type] = { count: 0, duration: 0, events: [] };
            }
            const duration = event.end_time ? differenceInMinutes(new Date(event.end_time), new Date(event.start_time)) : 0;
            acc[event.type].count++;
            acc[event.type].duration += duration;
            acc[event.type].events.push(event);
            return acc;
        }, {});

        return { dayEvents, totalMinutes, eventsByType };
    }, [day, events]);

    const { dayEvents, totalMinutes, eventsByType } = clockData;

    // SVG dimensions
    const size = 400;
    const center = size / 2;
    const clockRadius = 160;
    const eventRadius = 140;

    // Helper function to convert time to angle (0 degrees = 12 o'clock, clockwise)
    const timeToAngle = (hour, minute) => {
        const totalMinutes = hour * 60 + minute;
        // 0 minutes = -90 degrees (12 o'clock position)
        return (totalMinutes / (24 * 60)) * 360 - 90;
    };

    // Helper function to create arc path
    const createArcPath = (startAngle, endAngle, radius, innerRadius) => {
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = center + radius * Math.cos(startRad);
        const y1 = center + radius * Math.sin(startRad);
        const x2 = center + radius * Math.cos(endRad);
        const y2 = center + radius * Math.sin(endRad);

        const x3 = center + innerRadius * Math.cos(endRad);
        const y3 = center + innerRadius * Math.sin(endRad);
        const x4 = center + innerRadius * Math.cos(startRad);
        const y4 = center + innerRadius * Math.sin(startRad);

        const largeArc = endAngle - startAngle > 180 ? 1 : 0;

        return `
            M ${x1} ${y1}
            A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
            L ${x3} ${y3}
            A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
            Z
        `;
    };

    // Event type colors
    const typeColors = {
        personal: '#f59e0b',
        booked: '#10b981',
        blocked: '#ef4444',
    };

    const typeLabels = {
        personal: 'PERSONAL',
        booked: 'BOOKING',
        blocked: 'BLOCKED',
    };

    // Format hours and minutes
    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h${mins.toString().padStart(2, '0')}m`;
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row items-start lg:items-center justify-center bg-slate-100 dark:bg-slate-800 p-4 lg:p-8 gap-6 lg:gap-12 overflow-auto">
            {/* Clock container */}
            <div className="relative w-full max-w-md lg:max-w-xl xl:max-w-2xl flex-shrink-0">
                <svg
                    viewBox={`0 0 ${size} ${size}`}
                    className="w-full"
                    style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
                >
                    {/* Clock face background */}
                    <circle
                        cx={center}
                        cy={center}
                        r={clockRadius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-slate-300 dark:text-slate-600"
                    />

                    {/* Hour marks */}
                    {Array.from({ length: 24 }, (_, i) => {
                        const angle = (i / 24) * 360 - 90;
                        const rad = (angle * Math.PI) / 180;
                        const isQuarterMark = i % 6 === 0;
                        const markLength = isQuarterMark ? 15 : 8;
                        const markWidth = isQuarterMark ? 2 : 1;

                        const x1 = center + (clockRadius - markLength) * Math.cos(rad);
                        const y1 = center + (clockRadius - markLength) * Math.sin(rad);
                        const x2 = center + clockRadius * Math.cos(rad);
                        const y2 = center + clockRadius * Math.sin(rad);

                        return (
                            <line
                                key={i}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="currentColor"
                                strokeWidth={markWidth}
                                className="text-slate-400 dark:text-slate-500"
                            />
                        );
                    })}

                    {/* Hour labels for 00, 03, 06, 09, 12, 15, 18, 21 */}
                    {[0, 3, 6, 9, 12, 15, 18, 21].map(hour => {
                        const angle = (hour / 24) * 360 - 90;
                        const rad = (angle * Math.PI) / 180;
                        const labelRadius = clockRadius + 25;
                        const x = center + labelRadius * Math.cos(rad);
                        const y = center + labelRadius * Math.sin(rad);

                        return (
                            <text
                                key={hour}
                                x={x}
                                y={y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="text-sm font-semibold"
                                style={{
                                    fontSize: '14px',
                                    fill: isDarkMode ? '#ffffff' : '#64748b'
                                }}
                            >
                                {hour.toString().padStart(2, '0')}
                            </text>
                        );
                    })}

                    {/* Event arcs and markers */}
                    {dayEvents.map((event, idx) => {
                        const startTime = new Date(event.start_time);
                        const startHour = getHours(startTime);
                        const startMinute = getMinutes(startTime);
                        const startAngle = timeToAngle(startHour, startMinute);
                        const color = typeColors[event.type] || '#3b82f6';

                        // Events with no end time: render as a large dot
                        if (!event.end_time) {
                            const startRad = (startAngle * Math.PI) / 180;
                            const dotRadius = eventRadius - 20; // Position between inner and outer
                            const cx = center + dotRadius * Math.cos(startRad);
                            const cy = center + dotRadius * Math.sin(startRad);

                            return (
                                <g key={`${event.id}-${idx}`}>
                                    {/* Outer glow circle */}
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r="12"
                                        fill={color}
                                        opacity="0.3"
                                        className="cursor-pointer"
                                        onClick={() => onEventClick(event)}
                                    />
                                    {/* Main dot */}
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r="8"
                                        fill={color}
                                        className="cursor-pointer transition-all duration-200 hover:r-10"
                                        onClick={() => onEventClick(event)}
                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))' }}
                                    >
                                        <title>{`${event.title}\n${format(startTime, 'HH:mm')}`}</title>
                                    </circle>
                                </g>
                            );
                        }

                        // Events with end time: render as arcs
                        let endTime = new Date(event.end_time);

                        // For multi-day events, clamp the end time to 23:59 of the current day
                        const dayEnd = new Date(day);
                        dayEnd.setHours(23, 59, 59, 999);
                        if (endTime > dayEnd) {
                            endTime = dayEnd;
                        }

                        const endHour = getHours(endTime);
                        const endMinute = getMinutes(endTime);
                        const endAngle = timeToAngle(endHour, endMinute);

                        const arcPath = createArcPath(startAngle, endAngle, eventRadius, eventRadius - 40);

                        return (
                            <path
                                key={`${event.id}-${idx}`}
                                d={arcPath}
                                fill={color}
                                className="cursor-pointer transition-all duration-200 hover:opacity-80"
                                onClick={() => onEventClick(event)}
                                style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }}
                            >
                                <title>{`${event.title}\n${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`}</title>
                            </path>
                        );
                    })}

                    {/* Current time indicator - only show if viewing today */}
                    {isToday(day) && (() => {
                        const currentHour = getHours(currentTime);
                        const currentMinute = getMinutes(currentTime);
                        const currentAngle = timeToAngle(currentHour, currentMinute);
                        const currentRad = (currentAngle * Math.PI) / 180;

                        // Line from center to edge
                        const lineStart = 30; // Start from inside the center
                        const lineEnd = eventRadius + 20; // Extend past events

                        const x1 = center + lineStart * Math.cos(currentRad);
                        const y1 = center + lineStart * Math.sin(currentRad);
                        const x2 = center + lineEnd * Math.cos(currentRad);
                        const y2 = center + lineEnd * Math.sin(currentRad);

                        return (
                            <g>
                                {/* Current time line */}
                                <line
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke="#ef4444"
                                    strokeWidth="2"
                                    className="transition-all duration-1000"
                                />
                                {/* Dot at the end */}
                                <circle
                                    cx={x2}
                                    cy={y2}
                                    r="4"
                                    fill="#ef4444"
                                    className="transition-all duration-1000"
                                />
                                {/* Center dot */}
                                <circle
                                    cx={center}
                                    cy={center}
                                    r="6"
                                    fill="#ef4444"
                                />
                            </g>
                        );
                    })()}

                    {/* Center content */}
                    <g>
                        <text
                            x={center}
                            y={center - 60}
                            textAnchor="middle"
                            className="font-bold uppercase text-lg"
                            style={{
                                fontSize: '20px',
                                fill: isDarkMode ? '#ffffff' : '#0f172a'
                            }}
                        >
                            {format(day, 'EEEE')}
                        </text>
                        <text
                            x={center}
                            y={center - 30}
                            textAnchor="middle"
                            className="text-sm"
                            style={{
                                fontSize: '13px',
                                fill: isDarkMode ? '#cbd5e1' : '#64748b'
                            }}
                        >
                            {formatDuration(totalMinutes)} scheduled
                        </text>

                        {/* Event type breakdown */}
                        {Object.entries(eventsByType).map(([type, data], idx) => {
                            const yOffset = center + 30 + (idx * 35); // Increased from 25 to 35 for more spacing
                            return (
                                <g key={type}>
                                    <text
                                        x={center}
                                        y={yOffset}
                                        textAnchor="middle"
                                        className="font-semibold uppercase"
                                        style={{
                                            fontSize: '12px',
                                            fill: typeColors[type] || '#3b82f6'
                                        }}
                                    >
                                        {typeLabels[type] || type.toUpperCase()}
                                    </text>
                                    <text
                                        x={center}
                                        y={yOffset + 15}
                                        textAnchor="middle"
                                        style={{
                                            fontSize: '11px',
                                            fill: isDarkMode ? '#cbd5e1' : '#475569'
                                        }}
                                    >
                                        {formatDuration(data.duration)}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>

            {/* Event list - on the right for desktop, underneath for mobile */}
            <div className="w-full lg:w-96 xl:w-[28rem] flex-shrink-0">
                {dayEvents.length > 0 ? (
                    <div className="space-y-2 max-h-64 lg:max-h-[600px] overflow-y-auto pr-2">
                        <h3 className="text-sm lg:text-base font-semibold text-slate-600 dark:text-slate-300 mb-3 lg:mb-4">Events</h3>
                        {dayEvents.map((event, idx) => {
                            const startTime = new Date(event.start_time);
                            let endTime = event.end_time ? new Date(event.end_time) : null;

                            // For multi-day events, clamp the end time to 23:59 of the current day
                            if (endTime) {
                                const dayEnd = new Date(day);
                                dayEnd.setHours(23, 59, 59, 999);
                                if (endTime > dayEnd) {
                                    endTime = dayEnd;
                                }
                            }

                            const color = typeColors[event.type] || '#3b82f6';

                            return (
                                <div
                                    key={`${event.id}-${idx}`}
                                    className="flex items-center gap-3 p-2 lg:p-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                                    onClick={() => onEventClick(event)}
                                >
                                    <div
                                        className="w-3 h-3 lg:w-4 lg:h-4 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm lg:text-base font-medium text-slate-900 dark:text-white truncate">
                                            {event.title}
                                        </p>
                                        <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
                                            {endTime ? `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}` : `${format(startTime, 'HH:mm')}`}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            No events scheduled for this day
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClockView;
