const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/knex.cjs');

const JWT_SECRET = process.env.JWT_SECRET;

// Hash an API key the same way they're hashed at creation time so we can
// look them up by hash. SHA-256 is used (not bcrypt) because we need a
// deterministic value to do an indexed equality lookup on every request.
const hashApiKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

module.exports = async function(req, res, next) {
    // 1. API key path — persistent token issued from user settings.
    //    Sent in either `x-api-key` or as `Bearer <key>` in Authorization.
    let apiKey = req.header('x-api-key');
    if (!apiKey) {
        const authHeader = req.header('authorization');
        if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
            const candidate = authHeader.slice(7).trim();
            // Only treat Bearer tokens as API keys if they look like one
            // (so we don't break anything that may pass a JWT this way later).
            if (candidate.startsWith('mcb_')) {
                apiKey = candidate;
            }
        }
    }

    if (apiKey) {
        try {
            const record = await db('api_keys')
                .where({ hashed_key: hashApiKey(apiKey) })
                .first();
            if (!record) {
                return res.status(401).json({ error: 'Invalid API key.' });
            }
            const user = await db('users')
                .where({ id: record.user_id })
                .first('id', 'username', 'is_admin', 'is_two_factor_enabled');
            if (!user) {
                return res.status(401).json({ error: 'API key user no longer exists.' });
            }

            // Best-effort touch of last_used_at — don't block the request on it.
            db('api_keys')
                .where({ id: record.id })
                .update({ last_used_at: new Date() })
                .catch(() => {});

            req.user = user;
            return next();
        } catch (err) {
            console.error('API key auth error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    // 2. JWT path — original session-token flow used by the web app.
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid.' });
    }
};

module.exports.hashApiKey = hashApiKey;
