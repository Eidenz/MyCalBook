const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const authMiddleware = require('../middleware/auth.cjs');

// Protect all routes in this file
router.use(authMiddleware);

// --- Schedule Management ---

// GET /api/availability/schedules
// Fetches all availability schedules for the user
router.get('/schedules', async (req, res) => {
    try {
        const schedules = await db('availability_schedules')
            .where({ user_id: req.user.id })
            .orderBy('name', 'asc');
        res.json(schedules);
    } catch (error) {
        console.error("Error fetching schedules:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// POST /api/availability/schedules
// Creates a new availability schedule
router.post('/schedules', async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "Schedule name is required." });
    }
    try {
        const [newSchedule] = await db('availability_schedules')
            .insert({ user_id: req.user.id, name: name.trim() })
            .returning('*');
        res.status(201).json(newSchedule);
    } catch (error) {
        console.error("Error creating schedule:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// PUT /api/availability/schedules/:id
// Updates a schedule's name
router.put('/schedules/:id', async (req, res) => {
    const scheduleId = parseInt(req.params.id, 10);
    const { name } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "Schedule name is required." });
    }
    try {
        const [updatedSchedule] = await db('availability_schedules')
            .where({ id: scheduleId, user_id: req.user.id })
            .update({ name: name.trim(), updated_at: new Date() })
            .returning('*');
        if (!updatedSchedule) {
            return res.status(404).json({ error: "Schedule not found." });
        }
        res.json(updatedSchedule);
    } catch (error) {
        console.error("Error updating schedule:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// DELETE /api/availability/schedules/:id
// Deletes a schedule if it's not in use
router.delete('/schedules/:id', async (req, res) => {
    const scheduleId = parseInt(req.params.id, 10);
    try {
        // Check if any event type is using this schedule
        const eventTypeInUse = await db('event_types')
            .where({ schedule_id: scheduleId, user_id: req.user.id })
            .first();

        if (eventTypeInUse) {
            return res.status(409).json({ error: "Cannot delete schedule. It is in use by one or more event types." });
        }

        const count = await db('availability_schedules')
            .where({ id: scheduleId, user_id: req.user.id })
            .del();

        if (count === 0) {
            return res.status(404).json({ error: "Schedule not found." });
        }
        res.json({ message: 'Schedule deleted successfully.' });
    } catch (error) {
        console.error("Error deleting schedule:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


// --- Rule Management (for a specific schedule) ---

// GET /api/availability/rules/:scheduleId
router.get('/rules/:scheduleId', async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId, 10);
    if (isNaN(scheduleId)) return res.status(400).json({ error: "Invalid schedule ID." });
    
    try {
        const schedule = await db('availability_schedules').where({ id: scheduleId, user_id: req.user.id }).first();
        if (!schedule) {
            return res.status(404).json({ error: "Schedule not found." });
        }

        const rules = await db('availability_rules').where({ schedule_id: scheduleId }).orderBy('day_of_week');
        res.json(rules);
    } catch (error) {
        console.error("Error fetching availability rules:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


// PUT /api/availability/rules/:scheduleId
router.put('/rules/:scheduleId', async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId, 10);
    const { rules } = req.body;
    
    if (isNaN(scheduleId)) return res.status(400).json({ error: "Invalid schedule ID." });

    if (!Array.isArray(rules)) {
        return res.status(400).json({ error: "Request body must be an array of rules." });
    }
    for (const rule of rules) {
        if (rule.day_of_week == null || !rule.start_time || !rule.end_time) {
            return res.status(400).json({ error: "Each rule must have day_of_week, start_time, and end_time." });
        }
    }

    const trx = await db.transaction();
    try {
        const schedule = await trx('availability_schedules').where({ id: scheduleId, user_id: req.user.id }).first();
        if (!schedule) {
            await trx.rollback();
            return res.status(404).json({ error: "Schedule not found." });
        }

        await trx('availability_rules').where({ schedule_id: scheduleId }).del();
        
        if (rules.length > 0) {
            const rulesToInsert = rules.map(rule => ({
                schedule_id: scheduleId,
                day_of_week: rule.day_of_week,
                start_time: rule.start_time,
                end_time: rule.end_time
            }));
            await trx('availability_rules').insert(rulesToInsert);
        }

        await trx.commit();
        res.status(200).json({ message: 'Availability updated successfully.' });

    } catch (error) {
        await trx.rollback();
        console.error("Error updating availability rules:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

module.exports = router;