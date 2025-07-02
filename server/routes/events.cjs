const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const authMiddleware = require('../middleware/auth.cjs');
const emailService = require('../services/emailService.cjs');
const { RRule, RRuleSet, rrulestr } = require('rrule');

router.use(authMiddleware);

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
    const { title, start_time, end_time, type, description, guests, recurrence } = req.body;

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
            user_id: userId, title, start_time, end_time, type, description,
            guests: JSON.stringify(guests || []),
            recurrence_id: recurrenceId,
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

        let updatedEvent;

        if (updateScope === 'all' && parentEvent.recurrence_id) {
            // Update the parent event and its rule
            const { recurrence, ...restOfEventData } = eventData;
            await trx('manual_events').where({ id: parentEvent.id }).update({
                ...restOfEventData,
                guests: JSON.stringify(eventData.guests || []),
                updated_at: new Date(),
            });
            if (recurrence) {
                await trx('recurrence_rules').where({ id: parentEvent.recurrence_id }).update(recurrence);
            }
            updatedEvent = await trx('manual_events').where({ id: parentEvent.id }).first();

        } else if (updateScope === 'single' && parentEvent.recurrence_id) {
            // Create a new exception
            // THE FIX: Destructure `recurrence` out so it's not included in the insert.
            const { recurrence, ...restOfEventData } = eventData;

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
            // Standard non-recurring event update
            await trx('manual_events').where({ id: parentEventId }).update({
                ...eventData,
                guests: JSON.stringify(eventData.guests || []),
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

    if (isNaN(bookingId)) {
        return res.status(400).json({ error: 'Invalid booking ID.' });
    }

    try {
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
            return res.status(404).json({ error: 'Booking not found.' });
        }

        if (booking.user_id !== userId) {
            return res.status(403).json({ error: 'You do not have permission to delete this booking.' });
        }
        
        // 2. Fetch owner details for email
        const owner = await db('users').where({ id: userId }).first('username', 'email', 'email_notifications');

        // 3. Delete the booking from the database *first*
        await db('bookings').where({ id: bookingId }).del();

        // 4. Send cancellation emails (fire-and-forget)
        const duration = (new Date(booking.end_time) - new Date(booking.start_time)) / 60000;
        const emailDetails = {
            owner: { 
                username: owner.username, 
                email: owner.email, 
                email_notifications: owner.email_notifications 
            },
            eventType: { title: booking.eventTypeTitle, location: booking.eventTypeLocation },
            booker_name: booking.booker_name,
            booker_email: booking.booker_email,
            startTime: booking.start_time,
            duration: duration,
            guests: booking.guests ? JSON.parse(booking.guests) : [],
        };
        
        emailService.sendBookingCancellation(emailDetails);
        
        res.json({ message: 'Booking cancelled successfully.' });

    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;