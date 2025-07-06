const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const authMiddleware = require('../middleware/auth.cjs');
const emailService = require('../services/emailService.cjs');
const { RRule, RRuleSet, rrulestr } = require('rrule');
const multer = require('multer');
const ical = require('node-ical');
const { startOfDay, endOfDay } = require('date-fns');


router.use(authMiddleware);

// --- Configure Multer for ICS file uploads ---
const icsStorage = multer.memoryStorage();
const icsFileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/calendar' || file.originalname.endsWith('.ics')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only .ics files are allowed.'), false);
    }
};
const uploadIcs = multer({ storage: icsStorage, fileFilter: icsFileFilter, limits: { fileSize: 1024 * 1024 * 5 } }); // 5MB limit

// --- Recurrence Helper ---
const expandRecurringEvents = async (userId, startDate, endDate) => {
    // 1. Fetch parent recurring events for the user
    const parentEvents = await db('manual_events')
        .join('recurrence_rules', 'manual_events.recurrence_id', 'recurrence_rules.id')
        .where('manual_events.user_id', userId)
        .whereNull('manual_events.parent_event_id') // Ensure it's a parent event
        .select('manual_events.*', 'recurrence_rules.frequency', 'recurrence_rules.interval', 'recurrence_rules.end_date as recurrence_end_date', 'recurrence_rules.by_day');

    if (parentEvents.length === 0) return [];

    // 2. Fetch all exceptions for these parent events
    const parentEventIds = parentEvents.map(p => p.id);
    const exceptions = await db('manual_events').whereIn('parent_event_id', parentEventIds);
    const exceptionsMap = new Map();
    exceptions.forEach(ex => {
        const key = `${ex.parent_event_id}_${new Date(ex.original_start_time).toISOString()}`;
        exceptionsMap.set(key, ex);
    });

    const allOccurrences = [];

    // 3. Expand each recurring event
    for (const parent of parentEvents) {
        const duration = new Date(parent.end_time) - new Date(parent.start_time);
        
        const ruleOptions = {
            freq: RRule[parent.frequency],
            interval: parent.interval,
            dtstart: new Date(parent.start_time),
            until: parent.recurrence_end_date ? new Date(parent.recurrence_end_date) : null,
        };

        if (parent.frequency === 'WEEKLY' && parent.by_day) {
            ruleOptions.byweekday = parent.by_day.split(',').map(day => RRule[day]);
        }

        const rule = new RRule(ruleOptions);
        const occurrences = rule.between(new Date(startDate), new Date(endDate), true);

        for (const occurrenceDate of occurrences) {
            const originalStartTimeISO = occurrenceDate.toISOString();
            const exceptionKey = `${parent.id}_${originalStartTimeISO}`;
            const exception = exceptionsMap.get(exceptionKey);
            
            // Check for cancelled exceptions
            if (exception && exception.is_cancelled) {
                continue; // Skip this occurrence
            }
            
            // Check for edited exceptions
            if (exception) {
                 // Use the exception's data instead
                allOccurrences.push({ ...exception, recurrence_id: parent.recurrence_id });
            } else {
                // Create a normal occurrence
                const endTime = new Date(occurrenceDate.getTime() + duration);
                allOccurrences.push({
                    ...parent,
                    id: `${parent.id}-${occurrenceDate.getTime()}`, // Create a unique virtual ID
                    start_time: occurrenceDate.toISOString(),
                    end_time: endTime.toISOString(),
                });
            }
        }
    }
    return allOccurrences;
};

// --- Cancellation Helper Function ---
// This can be called from both authenticated and public routes
const triggerBookingCancellation = async (bookingId, cancelledBy = 'owner') => {
    // 1. Fetch booking and verify ownership
    const booking = await db('bookings')
        .join('event_types', 'bookings.event_type_id', 'event_types.id')
        .where('bookings.id', bookingId)
        .first(
            'bookings.*', 
            'event_types.user_id', 
            'event_types.title as eventTypeTitle', 
            'event_types.location as eventTypeLocation'
        );

    if (!booking) {
        throw new Error('Booking not found.');
    }

    // 2. Fetch owner details for email
    const owner = await db('users').where({ id: booking.user_id }).first('username', 'email', 'email_notifications');

    // 3. Delete the booking from the database *first*.
    // ON DELETE CASCADE will handle the booker's manual_event.
    await db('bookings').where({ id: bookingId }).del();

    // 4. Send cancellation emails (fire-and-forget)
    const duration = (new Date(booking.end_time) - new Date(booking.start_time)) / 60000;
    const emailDetails = {
        owner: { 
            username: owner.username, 
            email: owner.email, 
            email_notifications: owner.email_notifications 
        },
        cancelledBy,
        eventType: { title: booking.eventTypeTitle, location: booking.eventTypeLocation },
        booker_name: booking.booker_name,
        booker_email: booking.booker_email,
        startTime: booking.start_time,
        duration: duration,
        guests: booking.guests ? JSON.parse(booking.guests) : [],
    };
    
    emailService.sendBookingCancellation(emailDetails);
    
    return booking; // Return the booking details for verification if needed
};

// POST /api/events/import-ics
router.post('/import-ics', uploadIcs.single('icsfile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No .ics file provided.' });
    }

    try {
        const events = await ical.async.parseICS(req.file.buffer.toString());
        const eventsToInsert = [];
        const userId = req.user.id;

        // Helper function to parse RRULE and create recurrence rule
        const parseRRule = async (rruleString, trx) => {
            try {
                // Parse the RRULE string using rrulestr
                const rule = rrulestr(rruleString);
                const options = rule.options;

                // Map RRule frequency constants to database strings
                const freqMap = {
                    [RRule.YEARLY]: 'YEARLY',
                    [RRule.MONTHLY]: 'MONTHLY', 
                    [RRule.WEEKLY]: 'WEEKLY',
                    [RRule.DAILY]: 'DAILY'
                };

                const frequency = freqMap[options.freq];
                if (!frequency) {
                    return null;
                }

                const interval = options.interval || 1;
                const until = options.until;

                // Convert byweekday to comma-separated string
                let byDay = null;
                if (options.byweekday && options.byweekday.length > 0) {
                    const dayMap = {
                        0: 'MO', 1: 'TU', 2: 'WE', 3: 'TH', 
                        4: 'FR', 5: 'SA', 6: 'SU'
                    };
                    byDay = options.byweekday.map(day => {
                        // Handle both simple weekday numbers and RRule weekday objects
                        const dayNum = typeof day === 'object' ? day.weekday : day;
                        return dayMap[dayNum];
                    }).filter(Boolean).join(',');
                }

                // Create recurrence rule in database
                const [recurrenceRule] = await trx('recurrence_rules').insert({
                    frequency: frequency,
                    interval: interval,
                    end_date: until ? until.toISOString() : null,
                    by_day: byDay
                }).returning('id');

                return recurrenceRule.id;
            } catch (error) {
                return null;
            }
        };

        // Helper function for simple timezone offset calculation (fallback)
        const getSimpleTimezoneOffset = (timezone, date) => {
            const month = date.getUTCMonth(); // 0-11
            const day = date.getUTCDate();
            
            // Simple DST detection for Northern Hemisphere (March to October)
            // For Southern Hemisphere, this would be inverted
            const isDST = (month > 2 && month < 9) || 
                         (month === 2 && day >= 25) || 
                         (month === 9 && day < 25);
            
            const offsets = {
                // Western Europe
                'Europe/Paris': isDST ? 2 : 1,
                'Europe/London': isDST ? 1 : 0,
                'Europe/Berlin': isDST ? 2 : 1,
                'Europe/Rome': isDST ? 2 : 1,
                'Europe/Madrid': isDST ? 2 : 1,
                'Europe/Amsterdam': isDST ? 2 : 1,
                'Europe/Brussels': isDST ? 2 : 1,
                'Europe/Vienna': isDST ? 2 : 1,
                'Europe/Zurich': isDST ? 2 : 1,
                'Europe/Prague': isDST ? 2 : 1,
                'Europe/Warsaw': isDST ? 2 : 1,
                'Europe/Budapest': isDST ? 2 : 1,
                'Europe/Athens': isDST ? 3 : 2,
                'Europe/Helsinki': isDST ? 3 : 2,
                'Europe/Istanbul': isDST ? 3 : 3, // No DST since 2016

                // North America
                'America/New_York': isDST ? -4 : -5,
                'America/Detroit': isDST ? -4 : -5,
                'America/Toronto': isDST ? -4 : -5,
                'America/Chicago': isDST ? -5 : -6,
                'America/Winnipeg': isDST ? -5 : -6,
                'America/Denver': isDST ? -6 : -7,
                'America/Edmonton': isDST ? -6 : -7,
                'America/Los_Angeles': isDST ? -7 : -8,
                'America/Vancouver': isDST ? -7 : -8,
                'America/Phoenix': -7, // No DST
                'America/Anchorage': isDST ? -8 : -9,
                'America/Halifax': isDST ? -3 : -4,
                'America/Sao_Paulo': isDST ? -2 : -3, // DST abolished in 2019

                // Asia
                'Asia/Tokyo': 9, // No DST
                'Asia/Shanghai': 8, // No DST
                'Asia/Hong_Kong': 8, // No DST
                'Asia/Singapore': 8, // No DST
                'Asia/Seoul': 9, // No DST
                'Asia/Kolkata': 5.5, // No DST
                'Asia/Bangkok': 7, // No DST
                'Asia/Jakarta': 7, // No DST
                'Asia/Dubai': 4, // No DST
                'Asia/Manila': 8, // No DST

                // Australia & NZ
                'Australia/Sydney': isDST ? 11 : 10,
                'Australia/Melbourne': isDST ? 11 : 10,
                'Australia/Brisbane': 10, // No DST
                'Australia/Perth': 8, // No DST
                'Pacific/Auckland': isDST ? 13 : 12,

                // Africa
                'Africa/Johannesburg': 2, // No DST
                'Africa/Cairo': 2, // No DST

                // UTC
                'UTC': 0,
                'Etc/UTC': 0,
                'Etc/GMT': 0,
                'GMT': 0,
            };
            
            return offsets[timezone] || null;
        };

        await db.transaction(async trx => {
            for (const key in events) {
                if (events.hasOwnProperty(key)) {
                    const event = events[key];
                    
                    // Process only VEVENT types with a non-empty summary
                    if (event.type === 'VEVENT' && event.summary && event.summary.trim() !== '' && event.start && event.end) {
                        const isAllDay = event.start.datetype === 'date';
                        
                        let startDate, endDate;
                        
                        if (isAllDay) {
                            // For all-day events, use the date as-is
                            startDate = new Date(event.start);
                            endDate = new Date(event.end);
                            // For all-day events from iCal, the end date is exclusive.
                            endDate.setDate(endDate.getDate() - 1);
                        } else {
                            // Create base dates
                            startDate = new Date(event.start);
                            endDate = new Date(event.end);
                            
                            // Handle timezone correction for any timezone
                            if (event.start.tz && event.start.tz !== 'UTC') {
                                try {
                                    // Simple and reliable approach: Calculate what the UTC offset should be
                                    // for this timezone at this specific date
                                    
                                    // Create a date representing the time components as local time in the target timezone
                                    const year = startDate.getUTCFullYear();
                                    const month = startDate.getUTCMonth();
                                    const day = startDate.getUTCDate();
                                    const hours = startDate.getUTCHours();
                                    const minutes = startDate.getUTCMinutes();
                                    const seconds = startDate.getUTCSeconds();
                                    
                                    // Create a date in the target timezone for the same "wall clock" time
                                    // This tells us what the offset is for this date in this timezone
                                    const sampleDate = new Date(Date.UTC(year, month, day, 12, 0, 0)); // noon on this day
                                    
                                    // Use Intl.DateTimeFormat to get the offset
                                    const formatter = new Intl.DateTimeFormat('en', {
                                        timeZone: event.start.tz,
                                        timeZoneName: 'longOffset'
                                    });
                                    
                                    const parts = formatter.formatToParts(sampleDate);
                                    const offsetPart = parts.find(part => part.type === 'timeZoneName');
                                    
                                    if (offsetPart && offsetPart.value) {
                                        // Parse offset like "GMT+01:00" or "GMT-05:00"
                                        const offsetMatch = offsetPart.value.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
                                        if (offsetMatch) {
                                            const sign = offsetMatch[1] === '+' ? 1 : -1;
                                            const offsetHours = parseInt(offsetMatch[2]);
                                            const offsetMinutes = parseInt(offsetMatch[3] || '0');
                                            const totalOffsetHours = sign * (offsetHours + offsetMinutes / 60);
                                            
                                            // Apply the correction
                                            const offsetMs = totalOffsetHours * 60 * 60 * 1000;
                                            startDate = new Date(startDate.getTime() - offsetMs);
                                            endDate = new Date(endDate.getTime() - offsetMs);
                                        } else {
                                            throw new Error('Could not parse timezone offset: ' + offsetPart.value);
                                        }
                                    } else {
                                        throw new Error('Could not get timezone offset');
                                    }
                                } catch (timezoneError) {
                                    // Super simple fallback: Calculate offset manually for common zones
                                    const simpleOffset = getSimpleTimezoneOffset(event.start.tz, startDate);
                                    if (simpleOffset !== null) {
                                        const offsetMs = simpleOffset * 60 * 60 * 1000;
                                        startDate = new Date(startDate.getTime() - offsetMs);
                                        endDate = new Date(endDate.getTime() - offsetMs);
                                    }
                                }
                            }
                        }

                        let recurrenceId = null;

                        // Handle recurring events
                        if (event.rrule) {
                            // The rrule property might be a string or an object
                            let rruleString;
                            if (typeof event.rrule === 'string') {
                                rruleString = event.rrule;
                            } else if (event.rrule.toString) {
                                rruleString = event.rrule.toString();
                            } else {
                                continue;
                            }

                            recurrenceId = await parseRRule(rruleString, trx);
                        }

                        const eventData = {
                            user_id: userId,
                            title: event.summary,
                            description: event.description || null,
                            start_time: isAllDay ? startOfDay(startDate).toISOString() : startDate.toISOString(),
                            end_time: isAllDay ? endOfDay(endDate).toISOString() : endDate.toISOString(),
                            type: 'personal',
                            is_all_day: isAllDay,
                            recurrence_id: recurrenceId
                        };

                        eventsToInsert.push(eventData);
                    }
                }
            }

            // Insert all events in the transaction
            if (eventsToInsert.length > 0) {
                await trx('manual_events').insert(eventsToInsert);
            }
        });

        res.json({ 
            message: `Successfully imported ${eventsToInsert.length} events with proper timezone handling.`,
            recurring: eventsToInsert.filter(e => e.recurrence_id).length,
            single: eventsToInsert.filter(e => !e.recurrence_id).length
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to parse or import the .ics file. It may be malformed.' });
    }
});


// GET /api/events/manual?month=YYYY-MM
router.get('/manual', async (req, res) => {
    const userId = req.user.id;
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'Valid month query parameter (YYYY-MM) is required.' });
    }

    try {
        const [year, monthNum] = month.split('-').map(Number);
        const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
        const endDate = new Date(Date.UTC(year, monthNum, 1)); // Next month's start

        // Promise to fetch one-off manual events
        const manualEventsPromise = db('manual_events')
            .where({ user_id: userId })
            .whereNull('recurrence_id') // Not a recurring parent
            .whereNull('parent_event_id') // Not an exception
            .where('start_time', '>=', startDate.toISOString())
            .where('start_time', '<', endDate.toISOString());

        // Promise to fetch confirmed bookings
        const bookingsPromise = db('bookings')
            .join('event_types', 'bookings.event_type_id', 'event_types.id')
            .where('event_types.user_id', userId)
            .where('bookings.start_time', '>=', startDate.toISOString())
            .where('bookings.start_time', '<', endDate.toISOString())
            .select(
                'bookings.id', 'bookings.booker_name', 'bookings.booker_email',
                db.raw("event_types.title || ' with ' || bookings.booker_name as title"),
                'bookings.start_time', 'bookings.end_time', 'bookings.notes as description',
                'bookings.guests', db.raw("'booked' as type")
            );
            
        // Promise to fetch expanded recurring events
        const recurringEventsPromise = expandRecurringEvents(userId, startDate, endDate);

        const [manualEvents, bookings, recurringEvents] = await Promise.all([
            manualEventsPromise, bookingsPromise, recurringEventsPromise
        ]);

        const allEvents = [...manualEvents, ...bookings, ...recurringEvents].sort(
            (a, b) => new Date(a.start_time) - new Date(b.start_time)
        );
            
        res.json(allEvents);
    } catch (error) {
        console.error('Error fetching all events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// POST /api/events/manual
router.post('/manual', async (req, res) => {
    const userId = req.user.id; 
    const { title, start_time, end_time, type, description, guests, recurrence, booking_id, is_all_day } = req.body;

    if (!title || !start_time || !end_time || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const trx = await db.transaction();
    try {
        let recurrenceId = null;
        if (recurrence && recurrence.frequency) {
            const [rule] = await trx('recurrence_rules').insert({
                frequency: recurrence.frequency,
                interval: recurrence.interval,
                end_date: recurrence.end_date,
                by_day: recurrence.by_day,
            }).returning('id');
            recurrenceId = rule.id;
        }

        const newEventData = {
            user_id: userId, title, type, description,
            start_time: is_all_day ? startOfDay(new Date(start_time)).toISOString() : new Date(start_time).toISOString(),
            end_time: is_all_day ? endOfDay(new Date(end_time)).toISOString() : new Date(end_time).toISOString(),
            guests: JSON.stringify(guests || []),
            recurrence_id: recurrenceId,
            booking_id: booking_id,
            is_all_day: !!is_all_day
        };
        const [createdEvent] = await trx('manual_events').insert(newEventData).returning('*');
        
        await trx.commit();
        res.status(201).json(createdEvent);
    } catch (error) {
        await trx.rollback();
        console.error('Error creating manual event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// PUT /api/events/manual/:id
router.put('/manual/:id', async (req, res) => {
    const eventId = req.params.id; // Can be a composite ID for virtual events
    const userId = req.user.id;
    const { updateScope, original_start_time, ...eventData } = req.body;

    const trx = await db.transaction();
    try {
        // Find the original parent event
        const parentEventId = String(eventId).includes('-') ? eventId.split('-')[0] : eventId;
        const parentEvent = await trx('manual_events').where({ id: parentEventId, user_id: userId }).first();
        if (!parentEvent) {
             await trx.rollback();
             return res.status(404).json({ error: 'Event not found.' });
        }
        
        const isAllDay = eventData.is_all_day;
        const processedEventData = {
            title: eventData.title,
            type: eventData.type,
            description: eventData.description,
            guests: eventData.guests || [], // This will be stringified later
            is_all_day: !!isAllDay,
            start_time: isAllDay ? startOfDay(new Date(eventData.start_time)).toISOString() : new Date(eventData.start_time).toISOString(),
            end_time: isAllDay ? endOfDay(new Date(eventData.end_time)).toISOString() : new Date(eventData.end_time).toISOString(),
            recurrence: eventData.recurrence, // Keep this for recurrence logic below
        };

        let updatedEvent;

        if (updateScope === 'all' && parentEvent.recurrence_id) {
            const { recurrence, ...restOfEventData } = processedEventData;
            await trx('manual_events').where({ id: parentEvent.id }).update({
                ...restOfEventData,
                guests: JSON.stringify(restOfEventData.guests || []),
                updated_at: new Date(),
            });
            if (recurrence) {
                await trx('recurrence_rules').where({ id: parentEvent.recurrence_id }).update(recurrence);
            }
            updatedEvent = await trx('manual_events').where({ id: parentEvent.id }).first();

        } else if (updateScope === 'single' && parentEvent.recurrence_id) {
            const { recurrence, ...restOfEventData } = processedEventData;
            const exceptionData = {
                parent_event_id: parentEvent.id,
                user_id: userId,
                original_start_time: original_start_time,
                is_cancelled: false,
                ...restOfEventData,
                guests: JSON.stringify(restOfEventData.guests || []),
            };
            [updatedEvent] = await trx('manual_events').insert(exceptionData).returning('*');
        
        } else {
            const { recurrence, ...restOfEventData } = processedEventData;
            await trx('manual_events').where({ id: parentEventId }).update({
                ...restOfEventData,
                guests: JSON.stringify(restOfEventData.guests || []),
                updated_at: new Date(),
            });
            updatedEvent = await trx('manual_events').where({ id: parentEventId }).first();
        }
        
        await trx.commit();
        res.json(updatedEvent);

    } catch (error) {
        await trx.rollback();
        console.error('Error updating manual event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/events/manual/:id
router.delete('/manual/:id', async (req, res) => {
    const eventId = req.params.id;
    const userId = req.user.id;
    const { updateScope, original_start_time } = req.body;

    const trx = await db.transaction();
    try {
        const parentEventId = String(eventId).includes('-') ? eventId.split('-')[0] : eventId;
        const parentEvent = await trx('manual_events').where({ id: parentEventId, user_id: userId }).first();
        
        if (!parentEvent) {
            await trx.rollback();
            return res.status(404).json({ error: 'Event not found.' });
        }

        if (updateScope === 'all' && parentEvent.recurrence_id) {
            // Delete the entire series
            await trx('manual_events').where({ id: parentEvent.id }).del();
            // Recurrence rule is deleted via CASCADE
        } else if (updateScope === 'single' && parentEvent.recurrence_id) {
            // Create a cancellation exception
            await trx('manual_events').insert({
                parent_event_id: parentEvent.id,
                user_id: userId,
                original_start_time,
                is_cancelled: true,
                title: parentEvent.title,
                start_time: parentEvent.start_time, // these are just placeholders
                end_time: parentEvent.end_time,     // not used for cancelled events
            });
        } else {
            // Delete a single non-recurring event
            await trx('manual_events').where({ id: parentEvent.id }).del();
        }

        await trx.commit();
        res.json({ message: 'Event deleted successfully.' });

    } catch (error) {
        await trx.rollback();
        console.error('Error deleting manual event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// DELETE /api/events/bookings/:id
router.delete('/bookings/:id', async (req, res) => {
    const userId = req.user.id;
    const bookingId = parseInt(req.params.id, 10);

    try {
        const cancelledBooking = await triggerBookingCancellation(bookingId, 'owner');
        if (cancelledBooking.user_id !== userId) {
            return res.status(403).json({ error: 'You do not have permission to delete this booking.' });
        }
        res.json({ message: 'Booking cancelled.' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        if (error.message === 'Booking not found.') {
             return res.status(404).json({ error: 'Booking not found or already cancelled.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;
module.exports.triggerBookingCancellation = triggerBookingCancellation;