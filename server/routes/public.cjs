const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const emailService = require('../services/emailService.cjs');
const { format, startOfDay } = require('date-fns');

// --- Helper Functions ---

const getBlockedSlots = async (userId, startDate, endDate) => {
    const manualBlocks = await db('manual_events')
        .where({ user_id: userId })
        .where('start_time', '<', endDate.toISOString())
        .where('end_time', '>', startDate.toISOString());

    const bookedSlots = await db('bookings')
        .join('event_types', 'bookings.event_type_id', 'event_types.id')
        .where('event_types.user_id', userId)
        .where('bookings.start_time', '<', endDate.toISOString())
        .where('bookings.end_time', '>', startDate.toISOString())
        .select('bookings.start_time', 'bookings.end_time');

    return [...manualBlocks, ...bookedSlots].map(slot => ({
        start: new Date(slot.start_time),
        end: new Date(slot.end_time)
    }));
};

// Checks if a given day has at least one bookable slot.
const hasAvailableSlots = (date, rules, blockedSlots, duration) => {
    if (rules.length === 0) return false;

    for (const rule of rules) {
        const [startH, startM] = rule.start_time.split(':').map(Number);
        const [endH, endM] = rule.end_time.split(':').map(Number);

        let slotStart = new Date(date);
        slotStart.setUTCHours(startH, startM, 0, 0);

        let ruleEnd = new Date(date);
        ruleEnd.setUTCHours(endH, endM, 0, 0);

        if (ruleEnd <= slotStart) {
            ruleEnd.setUTCDate(ruleEnd.getUTCDate() + 1);
        }

        while (slotStart < ruleEnd) {
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            if (slotEnd > ruleEnd) break;

            const isBlocked = blockedSlots.some(blocked => (slotStart < blocked.end && slotEnd > blocked.start));
            if (!isBlocked) return true; // Found an available slot!

            slotStart.setUTCMinutes(slotStart.getUTCMinutes() + 15);
        }
    }
    return false; // No available slots found
};

// --- Public Routes ---

// GET /api/public/availability/:slug
router.get('/availability/:slug', async (req, res) => {
    const { slug } = req.params;
    const { date, duration: requestedDuration } = req.query;
    if (!date) return res.status(400).json({ error: 'A date query parameter is required.' });

    try {
        const eventType = await db('event_types').join('users', 'event_types.user_id', 'users.id').where({ slug }).first('event_types.*', 'users.username as ownerUsername');
        if (!eventType) return res.status(404).json({ error: 'This booking page does not exist.' });
        
        const selectedDate = new Date(date);
        const dbDate = format(startOfDay(selectedDate), 'yyyy-MM-dd');
        
        const override = await db('availability_overrides')
            .where({ schedule_id: eventType.schedule_id, date: dbDate }).first();

        let rulesForDay = [];
        if (override) {
            if (override.is_unavailable) {
                rulesForDay = []; // Day is explicitly blocked
            } else if (override.start_time && override.end_time) {
                rulesForDay = [{ start_time: override.start_time, end_time: override.end_time }];
            }
        } else {
            const availabilityRules = await db('availability_rules').where({ schedule_id: eventType.schedule_id });
            const dayOfWeek = selectedDate.getUTCDay();
            rulesForDay = availabilityRules.filter(r => r.day_of_week === dayOfWeek);
        }

        const dayStart = new Date(`${date}T00:00:00.000Z`);
        const dayEnd = new Date(`${date}T23:59:59.999Z`);
        const blockedSlots = await getBlockedSlots(eventType.user_id, dayStart, dayEnd);
        
        const availableSlots = [];
        const durationsToCalc = requestedDuration ? [parseInt(requestedDuration, 10)] : JSON.parse(eventType.durations);

        for (const rule of rulesForDay) {
            let slotStart = new Date(dayStart);
            slotStart.setUTCHours(...rule.start_time.split(':').map(Number), 0, 0);
            let ruleEnd = new Date(dayStart);
            ruleEnd.setUTCHours(...rule.end_time.split(':').map(Number), 0, 0);
            if (ruleEnd <= slotStart) ruleEnd.setUTCDate(ruleEnd.getUTCDate() + 1);

            while (slotStart < ruleEnd) {
                for (const duration of durationsToCalc) {
                    const slotEnd = new Date(slotStart.getTime() + duration * 60000);
                    if (slotEnd > ruleEnd) continue;
                    if (!blockedSlots.some(b => (slotStart < b.end && slotEnd > b.start))) {
                        availableSlots.push(slotStart.toISOString());
                    }
                }
                slotStart.setUTCMinutes(slotStart.getUTCMinutes() + 15);
            }
        }
        
        res.json({
            eventType: { ownerUsername: eventType.ownerUsername, title: eventType.title, description: eventType.description, location: eventType.location, durations: JSON.parse(eventType.durations), default_duration: eventType.default_duration },
            availableSlots: [...new Set(availableSlots)].sort()
        });
    } catch (error) {
        console.error("Error calculating availability:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// GET /api/public/availability/:slug/month?month=YYYY-MM
router.get('/availability/:slug/month', async (req, res) => {
    const { slug } = req.params;
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'Month parameter (YYYY-MM) is required.' });

    try {
        const eventType = await db('event_types').where({ slug }).first('id', 'user_id', 'schedule_id', 'default_duration');
        if (!eventType) return res.status(404).json({ error: 'Event type not found.' });
        
        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        
        const availabilityRules = await db('availability_rules').where({ schedule_id: eventType.schedule_id });
        const availableDays = new Set();
        
        const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
        const monthEnd = new Date(Date.UTC(year, monthNum, 1));
        const allBlockedSlots = await getBlockedSlots(eventType.user_id, monthStart, monthEnd);

        // Fetch all overrides for the month in one go
        const monthOverrides = await db('availability_overrides')
            .where({ schedule_id: eventType.schedule_id })
            .where('date', '>=', format(monthStart, 'yyyy-MM-dd'))
            .where('date', '<=', format(new Date(Date.UTC(year, monthNum - 1, daysInMonth)), 'yyyy-MM-dd'));
        const overridesMap = new Map(monthOverrides.map(o => [format(new Date(o.date), 'yyyy-MM-dd'), o]));


        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(Date.UTC(year, monthNum - 1, day));
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const override = overridesMap.get(dateStr);
            
            let rulesForDay;
            if (override) {
                if (override.is_unavailable || (!override.start_time || !override.end_time)) {
                    rulesForDay = [];
                } else {
                    rulesForDay = [{ start_time: override.start_time, end_time: override.end_time }];
                }
            } else {
                const dayOfWeek = currentDate.getUTCDay();
                rulesForDay = availabilityRules.filter(r => r.day_of_week === dayOfWeek);
            }

            const dayStart = new Date(currentDate);
            const dayEnd = new Date(currentDate);
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
            const blockedForDay = allBlockedSlots.filter(s => s.start < dayEnd && s.end > dayStart);

            if (hasAvailableSlots(currentDate, rulesForDay, blockedForDay, eventType.default_duration)) {
                availableDays.add(day);
            }
        }
        
        res.json({ availableDays: Array.from(availableDays) });
    } catch (error) {
        console.error("Error fetching monthly availability:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// GET /api/public/user/:username
router.get('/user/:username', async (req, res) => {
    try {
        const user = await db('users').where({ username: req.params.username }).first('id', 'username');
        if (!user) return res.status(404).json({ error: 'User not found.' });
        const eventTypes = await db('event_types').where({ user_id: user.id, is_public: true }).select('*').orderBy('title', 'asc');
        res.json({ user, eventTypes: eventTypes.map(et => ({ ...et, durations: JSON.parse(et.durations) })) });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// POST /api/public/bookings
router.post('/bookings', async (req, res) => {
    const { eventTypeSlug, startTime, duration, name, email, notes, guests } = req.body;
    if (!eventTypeSlug || !startTime || !duration || !name) return res.status(400).json({ error: 'Missing required booking information.' });

    try {
        const eventType = await db('event_types').where({ slug: eventTypeSlug }).first();
        if (!eventType) return res.status(404).json({ error: 'Event type does not exist.' });
        
        const owner = await db('users').where({ id: eventType.user_id }).first('id', 'username', 'email', 'email_notifications');
        if (!owner) return res.status(500).json({ error: 'Could not find event owner.' });

        const endTime = new Date(new Date(startTime).getTime() + duration * 60000);
        const newBooking = {
            event_type_id: eventType.id,
            start_time: new Date(startTime).toISOString(), end_time: endTime.toISOString(),
            booker_name: name, booker_email: email, notes,
            guests: JSON.stringify(guests || [])
        };

        const [booking] = await db('bookings').insert(newBooking).returning('*');
        const emailDetails = { owner, eventType, booker_name: name, booker_email: email, startTime, duration, guests };
        
        if (owner.email_notifications) emailService.sendBookingNotification(emailDetails);
        if (email) emailService.sendBookingConfirmation(emailDetails);

        res.status(201).json({ message: 'Booking confirmed!', booking });
    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

module.exports = router;