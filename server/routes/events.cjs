const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const authMiddleware = require('../middleware/auth.cjs');
const emailService = require('../services/emailService.cjs');

router.use(authMiddleware);

// GET /api/events/manual?month=YYYY-MM
router.get('/manual', async (req, res) => {
    const userId = req.user.id;
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'Valid month query parameter (YYYY-MM) is required.' });
    }

    try {
        const startDate = `${month}-01T00:00:00`;
        const [year, monthNum] = month.split('-').map(Number);
        const endDate = new Date(year, monthNum, 0);
        const endOfMonth = `${month}-${endDate.getDate()}T23:59:59`;

        // Promise to fetch manual events (personal, blocked)
        const manualEventsPromise = db('manual_events')
            .where({ user_id: userId })
            .where('start_time', '>=', startDate)
            .where('start_time', '<=', endOfMonth);

        // Promise to fetch confirmed bookings
        const bookingsPromise = db('bookings')
            .join('event_types', 'bookings.event_type_id', 'event_types.id')
            .where('event_types.user_id', userId)
            .where('bookings.start_time', '>=', startDate)
            .where('bookings.start_time', '<=', endOfMonth)
            .select(
                'bookings.id',
                'bookings.booker_name',
                'bookings.booker_email',
                db.raw("event_types.title || ' with ' || bookings.booker_name as title"),
                'bookings.start_time',
                'bookings.end_time',
                'bookings.notes as description',
                'bookings.guests',
                db.raw("'booked' as type")
            );

        // Wait for both queries to finish
        const [manualEvents, bookings] = await Promise.all([manualEventsPromise, bookingsPromise]);

        // Combine the two arrays and sort them by start time
        const allEvents = [...manualEvents, ...bookings].sort(
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
    const { title, start_time, end_time, type, description, guests } = req.body;

    if (!title || !start_time || !end_time || !type) {
        return res.status(400).json({ error: 'Missing required fields: title, start_time, end_time, type' });
    }
    
    if (!['personal', 'blocked'].includes(type)) {
        return res.status(400).json({ error: "Invalid event type. Must be 'personal' or 'blocked'." });
    }

    try {
        const newEvent = {
            user_id: userId,
            title,
            start_time,
            end_time,
            type,
            description,
            guests: JSON.stringify(guests || [])
        };

        const [createdEvent] = await db('manual_events').insert(newEvent).returning('*');
        
        res.status(201).json(createdEvent);
    } catch (error) {
        console.error('Error creating manual event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/events/manual/:id
router.put('/manual/:id', async (req, res) => {
    const userId = req.user.id;
    const eventId = parseInt(req.params.id, 10);
    const { title, start_time, end_time, type, description, guests } = req.body;

    if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID.' });
    }
    
    if (!title || !start_time || !end_time || !type) {
        return res.status(400).json({ error: 'Missing required fields: title, start_time, end_time, type' });
    }
    if (!['personal', 'blocked'].includes(type)) {
        return res.status(400).json({ error: "Invalid event type. Must be 'personal' or 'blocked'." });
    }

    try {
        const event = await db('manual_events').where({ id: eventId, user_id: userId }).first();
        if (!event) {
            return res.status(404).json({ error: 'Event not found or you do not have permission to edit it.' });
        }

        const updatedEventData = {
            title,
            start_time,
            end_time,
            type,
            description,
            guests: JSON.stringify(guests || []),
            updated_at: new Date()
        };

        const [updatedEvent] = await db('manual_events')
            .where({ id: eventId })
            .update(updatedEventData)
            .returning('*');
            
        res.json(updatedEvent);

    } catch (error) {
        console.error('Error updating manual event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/events/manual/:id
router.delete('/manual/:id', async (req, res) => {
    const userId = req.user.id;
    const eventId = parseInt(req.params.id, 10);

    if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID.' });
    }

    try {
        const event = await db('manual_events').where({ id: eventId, user_id: userId }).first();

        if (!event) {
            return res.status(404).json({ error: 'Event not found or you do not have permission to delete it.' });
        }

        await db('manual_events').where({ id: eventId }).del();

        res.json({ message: 'Event deleted successfully.' });

    } catch (error) {
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