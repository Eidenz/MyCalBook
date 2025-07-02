const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const authMiddleware = require('../middleware/auth.cjs');

router.use(authMiddleware);

// A helper function to create a URL-friendly slug
const generateSlug = (title, userId) => {
    const slugBase = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${slugBase}-${userId}-${Date.now().toString(36)}`;
};

// GET /api/event-types
// Fetches all event types for the authenticated user.
router.get('/', async (req, res) => {
    try {
        const eventTypes = await db('event_types')
            .where({ user_id: req.user.id })
            .orderBy('created_at', 'desc');
        res.json(eventTypes);
    } catch (error) {
        console.error("Error fetching event types:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// POST /api/event-types
router.post('/', async (req, res) => {
    const { title, location, schedule_id, description, durations, default_duration, is_public } = req.body;
    const userId = req.user.id;

    if (!title || !location || !schedule_id || !durations || !default_duration) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (!Array.isArray(durations) || durations.length === 0) {
        return res.status(400).json({ error: 'Durations must be a non-empty array.' });
    }

    try {
        const schedule = await db('availability_schedules').where({ id: schedule_id, user_id: userId }).first();
        if (!schedule) {
            return res.status(403).json({ error: 'Invalid schedule selected.' });
        }

        const newEventType = {
            user_id: userId,
            schedule_id: schedule.id,
            title,
            location,
            description,
            durations: JSON.stringify(durations.map(d => parseInt(d, 10))),
            default_duration: parseInt(default_duration, 10),
            is_public: typeof is_public === 'boolean' ? is_public : true,
            slug: generateSlug(title, userId)
        };

        const [createdEventType] = await db('event_types').insert(newEventType).returning('*');
        res.status(201).json(createdEventType);
    } catch (error) {
        console.error("Error creating event type:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


// PUT /api/event-types/:id
router.put('/:id', async (req, res) => {
    const eventTypeId = parseInt(req.params.id, 10);
    const { title, location, schedule_id, description, durations, default_duration, is_public } = req.body;
    const userId = req.user.id;

    if (!title || !location || !schedule_id || !durations || !default_duration) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (!Array.isArray(durations) || durations.length === 0) {
        return res.status(400).json({ error: 'Durations must be a non-empty array.' });
    }

    try {
        const existingEvent = await db('event_types').where({ id: eventTypeId, user_id: userId }).first();
        if (!existingEvent) {
            return res.status(404).json({ error: 'Event type not found.' });
        }

        const updatedEventTypeData = {
            title, 
            location, 
            schedule_id, 
            description,
            durations: JSON.stringify(durations.map(d => parseInt(d, 10))),
            default_duration: parseInt(default_duration, 10),
            is_public: typeof is_public === 'boolean' ? is_public : existingEvent.is_public,
            updated_at: new Date()
        };
        
        const [updatedEventType] = await db('event_types').where({ id: eventTypeId }).update(updatedEventTypeData).returning('*');
        res.json(updatedEventType);
    } catch (error) {
        console.error("Error updating event type:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


// DELETE /api/event-types/:id
router.delete('/:id', async (req, res) => {
    const eventTypeId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    try {
        const existingEvent = await db('event_types').where({ id: eventTypeId, user_id: userId }).first();
        if (!existingEvent) {
            return res.status(404).json({ error: 'Event type not found.' });
        }

        await db('event_types').where({ id: eventTypeId }).del();
        res.json({ message: 'Event type deleted successfully.' });
    } catch (error) {
        console.error("Error deleting event type:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

module.exports = router;