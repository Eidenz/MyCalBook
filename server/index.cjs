const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Create public directories if they don't exist to store uploads
const uploadsDir = path.join(__dirname, 'public', 'uploads');
try {
    if (!require('fs').existsSync(uploadsDir)) {
        require('fs').mkdirSync(uploadsDir, { recursive: true });
    }
} catch (e) {
    console.error("Could not create public/uploads directory", e);
}


const authRouter = require('./routes/auth.cjs');
const eventsRouter = require('./routes/events.cjs');
const availabilityRouter = require('./routes/availability.cjs');
const eventTypesRouter = require('./routes/eventTypes.cjs');
const publicRouter = require('./routes/public.cjs');
const settingsRouter = require('./routes/settings.cjs');
const uploadRouter = require('./routes/upload.cjs');
const db = require('./db/knex.cjs'); // Import db for SSR

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory (for uploads)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Main API Route
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the MyCalBook API!' });
});

// Register the API routers
app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/event-types', eventTypesRouter);
app.use('/api/public', publicRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/upload', uploadRouter);

const frontendBuildPath = path.join(__dirname, '..', 'client', 'dist');

// --- SSR for Social Media Meta Tags ---
// These handlers must come AFTER API routes but BEFORE the final static/SPA handlers.

// Handler for /book/:slug
app.get('/book/:slug', async (req, res, next) => {
    try {
        const { slug } = req.params;
        const eventType = await db('event_types')
            .join('users', 'event_types.user_id', 'users.id')
            .where('slug', slug)
            .first('event_types.title', 'event_types.description', 'event_types.image_url', 'users.username');

        if (!eventType) return next(); // Not found, let the SPA handle the 404

        const indexPath = path.join(frontendBuildPath, 'index.html');
        let htmlData = await fs.readFile(indexPath, 'utf8');

        // Prepare data for meta tags
        const pageTitle = `${eventType.title} - Book with ${eventType.username}`;
        const pageDescription = (eventType.description || `Schedule a ${eventType.title} event with ${eventType.username}.`).substring(0, 160).replace(/"/g, '\"');
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        const fullImageUrl = eventType.image_url ? `${req.protocol}://${req.get('host')}${eventType.image_url}` : null;
        
        // Construct meta tags
        let metaTags = `
            <title>${pageTitle}</title>
            <meta name="description" content="${pageDescription}">
            <meta property="og:title" content="${pageTitle}">
            <meta property="og:description" content="${pageDescription}">
            <meta property="og:url" content="${fullUrl}">
            <meta property="og:type" content="website">
            <meta name="twitter:card" content="${fullImageUrl ? 'summary_large_image' : 'summary'}">
            <meta name="theme-color" content="#6366f1">
        `;
        
        if (fullImageUrl) {
            metaTags += `<meta property="og:image" content="${fullImageUrl}">`;
        }

        htmlData = htmlData.replace('</head>', `${metaTags}</head>`);
        res.header('Content-Type', 'text/html').send(htmlData);

    } catch (err) {
        console.error('SSR Meta Tag Error (Book):', err);
        next(); // Fallback to SPA
    }
});

// Handler for /u/:username
app.get('/u/:username', async (req, res, next) => {
    try {
        const { username } = req.params;
        const user = await db('users')
            .where(db.raw('LOWER(username) = ?', username.toLowerCase()))
            .first('username');

        if (!user) return next();

        const indexPath = path.join(frontendBuildPath, 'index.html');
        let htmlData = await fs.readFile(indexPath, 'utf8');

        // Prepare data
        const pageTitle = `Book an event with ${user.username}`;
        const pageDescription = `See all available event types and schedule a time with ${user.username}.`;
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        // Construct meta tags
        const metaTags = `
            <title>${pageTitle}</title>
            <meta name="description" content="${pageDescription}">
            <meta property="og:title" content="${pageTitle}">
            <meta property="og:description" content="${pageDescription}">
            <meta property="og:url" content="${fullUrl}">
            <meta property="og:type" content="website">
            <meta name="twitter:card" content="summary">
            <meta name="theme-color" content="#6366f1">
        `;

        htmlData = htmlData.replace('</head>', `${metaTags}</head>`);
        res.header('Content-Type', 'text/html').send(htmlData);
    } catch (err) {
        console.error('SSR Meta Tag Error (User):', err);
        next();
    }
});


// --- Serve Frontend Static Files (Production) ---
app.use(express.static(frontendBuildPath));

// --- Add a catch-all handler for SPA client-side routing ---
// This must be AFTER all other routes, including the SSR routes.
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