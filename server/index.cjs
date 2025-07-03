const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db/knex.cjs');
require('dotenv').config();

// Create public directories if they don't exist to store uploads
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const authRouter = require('./routes/auth.cjs');
const eventsRouter = require('./routes/events.cjs');
const availabilityRouter = require('./routes/availability.cjs');
const eventTypesRouter = require('./routes/eventTypes.cjs');
const publicRouter = require('./routes/public.cjs');
const settingsRouter = require('./routes/settings.cjs');
const uploadRouter = require('./routes/upload.cjs');

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
const indexPath = path.join(frontendBuildPath, 'index.html');

// --- Dynamic Meta Tag Injection for Social Previews ---
app.use(async (req, res, next) => {
    const isBot = /discordbot|twitterbot|facebookexternalhit|bingbot|googlebot/i.test(req.headers['user-agent'] || '');
    const bookingPageMatch = req.path.match(/^\/book\/([a-zA-Z0-9-]+)/);

    if ((isBot || req.query.meta) && bookingPageMatch) {
        try {
            const slug = bookingPageMatch[1];
            
            const eventType = await db('event_types')
                .join('users', 'event_types.user_id', 'users.id')
                .where('event_types.slug', slug)
                .first('event_types.title', 'event_types.description', 'event_types.image_url', 'users.username');
            
            if (!eventType) {
                return next(); // Let the SPA handle the 404
            }
            
            // Read the template index.html file
            fs.readFile(indexPath, 'utf8', (err, htmlData) => {
                if (err) {
                    console.error('Error reading index.html:', err);
                    return res.status(500).send('Error serving the page.');
                }

                const appBaseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
                
                // Set default and specific meta tags
                const title = `Book "${eventType.title}" with ${eventType.username}`;
                const description = eventType.description || `Schedule a time with ${eventType.username} on MyCalBook.`;
                let imageUrl = eventType.image_url || `${appBaseUrl}/icon.png`; // Fallback to a default icon
                
                // Ensure image URL is absolute
                if (imageUrl && imageUrl.startsWith('/')) {
                    imageUrl = `${appBaseUrl}${imageUrl}`;
                }

                // Inject meta tags into the HTML
                const injectedHtml = htmlData
                    .replace(/<title>.*<\/title>/, `<title>${title}</title>`)
                    .replace(
                        '</head>',
                        `<meta name="description" content="${description}" />
                         <meta property="og:title" content="${title}" />
                         <meta property="og:description" content="${description}" />
                         <meta property="og:image" content="${imageUrl}" />
                         <meta property="og:url" content="${appBaseUrl}${req.originalUrl}" />
                         <meta property="og:type" content="website" />
                         <meta name="twitter:card" content="summary_large_image" />
                         </head>`
                    );
                
                res.send(injectedHtml);
            });
        } catch (error) {
            console.error('Error fetching event type for meta tags:', error);
            next(); // Proceed to the standard handler on error
        }
    } else {
        next();
    }
});


// --- Serve Frontend Static Files (Production) ---
app.use(express.static(frontendBuildPath));

// --- SPA Catch-all Handler ---
// This must be AFTER all other routes. It serves the main index.html for any
// non-API, non-file request, allowing client-side routing to take over.
app.get('*', (req, res) => {
    res.sendFile(indexPath);
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