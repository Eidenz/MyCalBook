const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const authMiddleware = require('../middleware/auth.cjs');

// Protect all routes in this file
router.use(authMiddleware);

// This function now accepts an optional transaction object
const getDefaultSchedule = async (userId, trx = db) => {
    // It will use the transaction object if provided, otherwise the global db object.
    let schedule = await trx('availability_schedules').where({ user_id: userId, name: 'Default' }).first();
    if (!schedule) {
        [schedule] = await trx('availability_schedules').insert({ user_id: userId, name: 'Default' }).returning('*');
    }
    return schedule;
};


// GET /api/availability/rules
// This route does not use a transaction, so it's fine as is.
router.get('/rules', async (req, res) => {
    try {
        // Here, getDefaultSchedule will use the global `db` object by default.
        const schedule = await getDefaultSchedule(req.user.id);
        const rules = await db('availability_rules').where({ schedule_id: schedule.id }).orderBy('day_of_week');
        res.json(rules);
    } catch (error) {
        console.error("Error fetching availability rules:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


// PUT /api/availability/rules
// This route USES a transaction, so we need to make the changes here.
router.put('/rules', async (req, res) => {
    const { rules } = req.body;
    
    if (!Array.isArray(rules)) {
        return res.status(400).json({ error: "Request body must be an array of rules." });
    }
    for (const rule of rules) {
        if (rule.day_of_week == null || !rule.start_time || !rule.end_time) {
            return res.status(400).json({ error: "Each rule must have day_of_week, start_time, and end_time." });
        }
    }

    const trx = await db.transaction(); // Start transaction
    try {
        // **THE FIX:** Pass the `trx` object to the helper function.
        const schedule = await getDefaultSchedule(req.user.id, trx);

        // This query already correctly used `trx`
        await trx('availability_rules').where({ schedule_id: schedule.id }).del();
        
        if (rules.length > 0) {
            const rulesToInsert = rules.map(rule => ({
                schedule_id: schedule.id,
                day_of_week: rule.day_of_week,
                start_time: rule.start_time,
                end_time: rule.end_time
            }));
            // This query already correctly used `trx`
            await trx('availability_rules').insert(rulesToInsert);
        }

        await trx.commit(); // Commit the transaction
        res.status(200).json({ message: 'Availability updated successfully.' });

    } catch (error) {
        await trx.rollback(); // Rollback on error
        console.error("Error updating availability rules:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


module.exports = router;