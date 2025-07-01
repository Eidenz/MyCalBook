const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRouter = require('./routes/auth.cjs');
const eventsRouter = require('./routes/events.cjs');
const availabilityRouter = require('./routes/availability.cjs');
const eventTypesRouter = require('./routes/eventTypes.cjs');
const publicRouter = require('./routes/public.cjs');
const settingsRouter = require('./routes/settings.cjs');

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
app.use('/api/settings', settingsRouter);

const frontendBuildPath = path.join(__dirname, '..', 'public');

// --- Serve Frontend Static Files (Production) ---
app.use(express.static(frontendBuildPath));

// --- Add a catch-all handler for SPA client-side routing ---
// This must be AFTER all other routes
app.use((req, res, next) => {
  // Only handle GET requests to non-API routes
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  } else {
    next();
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack); // Log detailed error server-side
  // Send generic message to client in production
  if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ message: 'An unexpected error occurred.' });
  } else {
      // Send detailed error in development
      res.status(500).json({ message: err.message, error: err });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});