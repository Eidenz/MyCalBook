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
        const decoded = jwt.verify(tfaToken, JWT_SECRET);
        if (!decoded.tfa_required) {
            return res.status(401).json({ error: 'Invalid temporary token.' });
        }

        const user = await db('users').where({ id: decoded.user.id }).first();
        if (!user || !user.is_two_factor_enabled || !user.two_factor_secret) {
            return res.status(401).json({ error: '2FA is not properly configured for this user.' });
        }

        const isValid = authenticator.check(otp, user.two_factor_secret);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid authentication code.' });
        }

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

// --- User Login (Step 2b: Recovery Code Verification) ---
router.post('/2fa/recover', async (req, res) => {
    const { tfaToken, recoveryCode } = req.body;
    if (!tfaToken || !recoveryCode) {
        return res.status(400).json({ error: 'Temporary token and recovery code are required.' });
    }

    const trx = await db.transaction();
    try {
        const decoded = jwt.verify(tfaToken, JWT_SECRET);
        if (!decoded.tfa_required) {
            await trx.rollback();
            return res.status(401).json({ error: 'Invalid temporary token.' });
        }

        const user = await trx('users').where({ id: decoded.user.id }).first();
        if (!user || !user.is_two_factor_enabled) {
            await trx.rollback();
            return res.status(401).json({ error: '2FA is not enabled for this user.' });
        }

        const hashedCodes = await trx('recovery_codes').where({ user_id: user.id });
        let isMatch = false;
        for (const code of hashedCodes) {
            if (await bcrypt.compare(recoveryCode, code.hashed_code)) {
                isMatch = true;
                break;
            }
        }

        if (!isMatch) {
            await trx.rollback();
            return res.status(401).json({ error: 'Invalid recovery code.' });
        }

        // --- SECURITY CRITICAL ---
        // If recovery code is valid, disable 2FA and delete all recovery codes.
        await trx('users').where({ id: user.id }).update({
            is_two_factor_enabled: false,
            two_factor_secret: null,
        });
        await trx('recovery_codes').where({ user_id: user.id }).del();
        
        // Issue the final JWT. The new payload reflects that 2FA is now disabled.
        const payload = {
            user: {
                id: user.id,
                username: user.username,
                is_admin: user.is_admin,
                is_two_factor_enabled: false, // Update status in token
            }
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
        
        await trx.commit();
        res.json({ token });

    } catch (error) {
        await trx.rollback();
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }
        console.error('2FA Recovery Error:', error);
        res.status(500).json({ error: 'Internal server error during recovery.' });
    }
});


module.exports = router;