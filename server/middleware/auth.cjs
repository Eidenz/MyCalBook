const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function(req, res, next) {
    // Get token from the header
    const token = req.header('x-auth-token');

    // Check if not token
    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied.' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Add user from payload to the request object
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid.' });
    }
};