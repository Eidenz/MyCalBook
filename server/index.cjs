const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRouter = require('./routes/auth.cjs');
const eventsRouter = require('./routes/events.cjs');
const availabilityRouter = require('./routes/availability.cjs');
const eventTypesRouter = require('./routes/eventTypes.cjs');
const publicRouter = require('./routes/public.cjs');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Main API Route
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the MyCalBook API!' });
});

// Register the events router
app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/event-types', eventTypesRouter);
app.use('/api/public', publicRouter);

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});