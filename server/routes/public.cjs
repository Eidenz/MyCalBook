const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');

// --- Availability Calculation Logic ---

// Function to get all blocked-off times for a user in a given period.
// This includes their manual 'blocked' events and already confirmed bookings.
const getBlockedSlots = async (userId, startDate, endDate) => {
    const manualBlocks = await db('manual_events')
        .where({ user_id: userId })
        .where('start_time', '<', endDate.toISOString())
        .where('end_time', '>', startDate.toISOString());

    // This is a bit more complex because bookings link to event_types, which link to users.
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

// Main public endpoint
// GET /api/public/availability/:slug?date=YYYY-MM-DD&duration=60
router.get('/availability/:slug', async (req, res) => {
    const { slug } = req.params;
    // **THE FIX (Backend): Accept a duration query parameter**
    const { date, duration: requestedDuration } = req.query; // The specific day the booker has selected

    if (!date) {
        return res.status(400).json({ error: 'A date query parameter is required.' });
    }

    try {
        // 1. Find the event type and its owner (the user being booked)
        const eventType = await db('event_types').where({ slug }).first();
        if (!eventType) {
            return res.status(404).json({ error: 'This booking page does not exist.' });
        }
        
        const userId = eventType.user_id;

        // 2. Get the user's availability rules for this event's schedule
        const availabilityRules = await db('availability_rules').where({ schedule_id: eventType.schedule_id });
        
        const selectedDate = new Date(date);
        const dayOfWeek = selectedDate.getUTCDay();
        const rulesForDay = availabilityRules.filter(r => r.day_of_week === dayOfWeek);

        const dayStart = new Date(`${date}T00:00:00.000Z`);
        const dayEnd = new Date(`${date}T23:59:59.999Z`);
        const blockedSlots = await getBlockedSlots(userId, dayStart, dayEnd);

        const availableSlots = [];
        // **THE FIX (Backend): Decide which durations to calculate for**
        // If a specific duration is requested, use only that. Otherwise, use all from the event type.
        const durationsToCalc = requestedDuration 
            ? [parseInt(requestedDuration, 10)] 
            : JSON.parse(eventType.durations);

        for (const rule of rulesForDay) {
            const [startH, startM] = rule.start_time.split(':').map(Number);
            const [endH, endM] = rule.end_time.split(':').map(Number);

            let slotStart = new Date(dayStart);
            slotStart.setUTCHours(startH, startM, 0, 0);

            const ruleEnd = new Date(dayStart);
            ruleEnd.setUTCHours(endH, endM, 0, 0);

            while (slotStart < ruleEnd) {
                // **THE FIX (Backend): Use our new list of durations to check**
                for (const duration of durationsToCalc) {
                    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

                    if (slotEnd > ruleEnd) continue;

                    const isBlocked = blockedSlots.some(blocked => 
                        (slotStart < blocked.end && slotEnd > blocked.start)
                    );

                    if (!isBlocked) {
                        availableSlots.push(slotStart.toISOString());
                    }
                }
                slotStart.setMinutes(slotStart.getMinutes() + 15);
            }
        }
        
        const uniqueSlots = [...new Set(availableSlots)].sort();
        
        res.json({
            eventType: {
                title: eventType.title,
                description: eventType.description,
                location: eventType.location,
                durations: JSON.parse(eventType.durations),
                default_duration: eventType.default_duration
            },
            availableSlots: uniqueSlots
        });

    } catch (error) {
        console.error("Error calculating availability:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// GET /api/public/availability/:slug/month?month=YYYY-MM
router.get('/availability/:slug/month', async (req, res) => {
    const { slug } = req.params;
    const { month } = req.query; // e.g., "2025-01"

    if (!month) return res.status(400).json({ error: 'Month parameter (YYYY-MM) is required.' });

    try {
        const eventType = await db('event_types').where({ slug }).first();
        if (!eventType) return res.status(404).json({ error: 'Event type not found.' });
        
        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        
        const availabilityRules = await db('availability_rules').where({ schedule_id: eventType.schedule_id });
        const availableDays = new Set();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(Date.UTC(year, monthNum - 1, day));
            const dayOfWeek = currentDate.getUTCDay();
            const rulesForDay = availabilityRules.filter(r => r.day_of_week === dayOfWeek);

            if (rulesForDay.length > 0) {
                availableDays.add(day);
            }
        }
        
        res.json({ availableDays: Array.from(availableDays) });

    } catch (error)
    {
        console.error("Error fetching monthly availability:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// POST /api/public/bookings
router.post('/bookings', async (req, res) => {
    const { eventTypeSlug, startTime, duration, name, email, notes, guests } = req.body;

    if (!eventTypeSlug || !startTime || !duration || !name) {
        return res.status(400).json({ error: 'Missing required booking information.' });
    }

    try {
        const eventType = await db('event_types').where({ slug: eventTypeSlug }).first();
        if (!eventType) {
            return res.status(404).json({ error: 'The requested event type does not exist.' });
        }
        
        const endTime = new Date(new Date(startTime).getTime() + duration * 60000);

        const newBooking = {
            event_type_id: eventType.id,
            start_time: new Date(startTime).toISOString(),
            end_time: endTime.toISOString(),
            booker_name: name,
            booker_email: email,
            notes: notes,
            guests: JSON.stringify(guests || []) // Store the guests as a JSON string
        };

        const [booking] = await db('bookings').insert(newBooking).returning('*');
        
        res.status(201).json({ message: 'Booking confirmed successfully!', booking });

    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

module.exports = router;