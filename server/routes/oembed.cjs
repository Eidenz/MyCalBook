const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');

// GET /api/oembed?url=...&format=json
// oEmbed endpoint for MyCalBook resources (event types, user profiles)
router.get('/', async (req, res) => {
  try {
    const { url, format } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'url parameter is required' });
    }

    if (format && format !== 'json') {
      return res.status(501).json({ error: 'Only JSON format is supported' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Match /book/:slug
    const bookMatch = parsedUrl.pathname.match(/^\/book\/([^/]+)$/);
    // Match /u/:username
    const userMatch = parsedUrl.pathname.match(/^\/u\/([^/]+)$/);

    if (bookMatch) {
      return handleEventType(res, bookMatch[1], url, baseUrl);
    }
    if (userMatch) {
      return handleUserProfile(res, userMatch[1], url, baseUrl);
    }

    return res.status(404).json({ error: 'Resource not found' });
  } catch (err) {
    console.error('oEmbed error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleEventType(res, slug, originalUrl, baseUrl) {
  const eventType = await db('event_types')
    .join('users', 'event_types.user_id', 'users.id')
    .where('slug', slug)
    .where('event_types.is_public', true)
    .first(
      'event_types.title',
      'event_types.description',
      'event_types.image_url',
      'event_types.durations',
      'event_types.default_duration',
      'event_types.location',
      'users.username'
    );

  if (!eventType) {
    return res.status(404).json({ error: 'Event type not found' });
  }

  const thumbnailUrl = eventType.image_url
    ? `${baseUrl}${eventType.image_url}`
    : null;

  // Parse durations (stored as JSON array string)
  let durations = [];
  try {
    durations = typeof eventType.durations === 'string'
      ? JSON.parse(eventType.durations)
      : eventType.durations || [];
  } catch {
    if (eventType.default_duration) {
      durations = [eventType.default_duration];
    }
  }

  return res.json({
    version: '1.0',
    type: 'rich',
    provider_name: 'MyCalBook',
    provider_url: baseUrl,
    provider_icon: `${baseUrl}/favicon.svg`,
    title: eventType.title,
    description: (eventType.description || `Book a ${eventType.title} with ${eventType.username}`).substring(0, 200),
    author_name: eventType.username,
    thumbnail_url: thumbnailUrl,
    thumbnail_width: thumbnailUrl ? 800 : null,
    thumbnail_height: thumbnailUrl ? 400 : null,
    x_app: {
      app_type: 'mycalbook',
      resource_type: 'event_type',
      color: '#6366f1',
      data: {
        durations,
        location: eventType.location || null,
        host: eventType.username
      }
    }
  });
}

async function handleUserProfile(res, username, originalUrl, baseUrl) {
  const user = await db('users')
    .where(db.raw('LOWER(username) = ?', username.toLowerCase()))
    .first('id', 'username');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const eventTypeCount = await db('event_types')
    .where({ user_id: user.id, is_public: true })
    .count('id as count')
    .first();

  return res.json({
    version: '1.0',
    type: 'rich',
    provider_name: 'MyCalBook',
    provider_url: baseUrl,
    provider_icon: `${baseUrl}/favicon.svg`,
    title: `Book with ${user.username}`,
    description: `${eventTypeCount.count || 0} event types available`,
    author_name: user.username,
    thumbnail_url: null,
    thumbnail_width: null,
    thumbnail_height: null,
    x_app: {
      app_type: 'mycalbook',
      resource_type: 'user_profile',
      color: '#6366f1',
      data: {
        username: user.username,
        event_type_count: eventTypeCount.count || 0
      }
    }
  });
}

module.exports = router;
