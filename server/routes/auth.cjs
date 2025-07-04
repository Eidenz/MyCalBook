const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const authMiddleware = require('../middleware/auth.cjs');


// Ensure you have a JWT_SECRET in your environment variables.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined.");
}

// --- User Registration ---
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    try {
        const existingUser = await db('users').where({ email }).orWhere({ username }).first();
        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const [newUser] = await db('users').insert({ username, email, password_hash }).returning(['id', 'username', 'email']);
        
        res.status(201).json({ message: 'User registered successfully. You may log in now.', user: newUser });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
});


// --- User Login (Step 1: Password) ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const user = await db('users').where({ email }).first();
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // --- 2FA Check ---
        if (user.is_two_factor_enabled) {
            // User has 2FA enabled. Issue a temporary token for the next step.
            const tfaPayload = { user: { id: user.id }, tfa_required: true };
            const tfaToken = jwt.sign(tfaPayload, JWT_SECRET, { expiresIn: '5m' });
            return res.json({ tfaRequired: true, tfaToken });
        }

        // --- Standard Login (No 2FA) ---
        const payload = {
            user: {
                id: user.id,
                username: user.username,
                is_admin: user.is_admin,
                is_two_factor_enabled: user.is_two_factor_enabled,
            }
        };

        jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
});


// --- User Login (Step 2: 2FA Verification) ---
router.post('/2fa/verify', async (req, res) => {
    const { tfaToken, otp } = req.body;
    if (!tfaToken || !otp) {
        return res.status(400).json({ error: 'Temporary token and OTP are required.' });
    }

    try {
        // 1. Verify the temporary token
        const decoded = jwt.verify(tfaToken, JWT_SECRET);
        if (!decoded.tfa_required) {
            return res.status(401).json({ error: 'Invalid temporary token.' });
        }

        // 2. Fetch the user's secret
        const user = await db('users').where({ id: decoded.user.id }).first();
        if (!user || !user.is_two_factor_enabled || !user.two_factor_secret) {
            return res.status(401).json({ error: '2FA is not properly configured for this user.' });
        }

        // 3. Check the OTP
        const isValid = authenticator.check(otp, user.two_factor_secret);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid authentication code.' });
        }

        // 4. OTP is valid, issue the final, full-privilege JWT
        const payload = {
            user: {
                id: user.id,
                username: user.username,
                is_admin: user.is_admin,
                is_two_factor_enabled: user.is_two_factor_enabled,
            }
        };

        jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }
        console.error('2FA Verification Error:', error);
        res.status(500).json({ error: 'Internal server error during 2FA verification.' });
    }
});


module.exports = router;