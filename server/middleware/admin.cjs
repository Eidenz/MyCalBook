const db = require('../db/knex.cjs');

module.exports = async function(req, res, next) {
    // This middleware should run AFTER the standard auth middleware
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
        const user = await db('users').where({ id: req.user.id }).first('is_admin');
        
        // Check if user exists and is an admin
        if (user && user.is_admin) {
            next(); // User is an admin, proceed to the route
        } else {
            res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
        }
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};