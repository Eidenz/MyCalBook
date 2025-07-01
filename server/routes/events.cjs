const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const authMiddleware = require('../middleware/auth.cjs');

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
                db.raw("event_types.title || ' with ' || bookings.booker_name as title"),
                'bookings.start_time',
                'bookings.end_time',
                'bookings.notes as description',
                'bookings.guests', // <-- Add this
                db.raw("'booked' as type")
            );

        const [manualEvents, bookings] = await Promise.all([manualEventsPromise, bookingsPromise]);

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
            guests: JSON.stringify(guests || []) // <-- Add this
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
            guests: JSON.stringify(guests || []), // <-- Add this
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

module.exports = router;