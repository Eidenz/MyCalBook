const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRouter = require('./routes/auth.cjs');
const eventsRouter = require('./routes/events.cjs');

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

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});