const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const { randomBytes } = require('crypto');
const authMiddleware = require('../middleware/auth.cjs');

// Helper to generate recovery codes
const generateRecoveryCodes = () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        // Generate a 6-byte random buffer, convert to a hex string of 12 chars
        // and format it into three groups of four. e.g., "ab12-cd34-ef56"
        const code = randomBytes(6).toString('hex').match(/.{1,4}/g).join('-');
        codes.push(code);
    }
    return codes;
};

// Protect all routes in this file
router.use(authMiddleware);

// --- GET /api/settings ---
router.get('/', async (req, res) => {
    try {
        const user = await db('users')
            .where({ id: req.user.id })
            .first('email', 'username', 'email_notifications', 'is_two_factor_enabled', 'booking_page_subtitle');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json(user);
    } catch (error) {
        console.error("Error fetching user settings:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// --- PUT /api/settings ---
router.put('/', async (req, res) => {
    const { email_notifications, booking_page_subtitle } = req.body;
    const updates = {};
    if (typeof email_notifications === 'boolean') {
        updates.email_notifications = email_notifications;
    }
    if (typeof booking_page_subtitle === 'string') {
        updates.booking_page_subtitle = booking_page_subtitle;
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update.' });
    }

    try {
        const [updatedUser] = await db('users')
            .where({ id: req.user.id })
            .update(updates)
            .returning(['email', 'username', 'email_notifications', 'is_two_factor_enabled', 'booking_page_subtitle']);

        res.json({ message: 'Settings updated successfully.', settings: updatedUser });
    } catch (error) {
        console.error("Error updating user settings:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// --- PUT /api/settings/password ---
router.put('/password', async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'All password fields are required.' });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New passwords do not match.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    try {
        const user = await db('users').where({ id: req.user.id }).first('password_hash');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect current password.' });
        }

        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);
        await db('users').where({ id: req.user.id }).update({ password_hash: newPasswordHash });

        res.json({ message: 'Password updated successfully.' });

    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// --- DELETE /api/settings/account ---
router.delete('/account', async (req, res) => {
    const userId = req.user.id;
    try {
        await db('users').where({ id: userId }).del();
        res.json({ message: 'Account deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting account for user ${userId}:`, error);
        res.status(500).json({ error: 'Internal server error during account deletion.' });
    }
});

// --- POST /api/settings/2fa/generate ---
router.post('/2fa/generate', async (req, res) => {
    const trx = await db.transaction();
    try {
        const user = await trx('users').where({ id: req.user.id }).first();
        if (!user) {
            await trx.rollback();
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Generate new 2FA secret and recovery codes
        const secret = authenticator.generateSecret();
        const recoveryCodes = generateRecoveryCodes();
        
        // Hash the recovery codes
        const salt = await bcrypt.genSalt(10);
        const hashedCodes = await Promise.all(recoveryCodes.map(code => bcrypt.hash(code, salt)));
        
        // Store everything in the database
        await trx('users')
            .where({ id: user.id })
            .update({ two_factor_secret: secret, is_two_factor_enabled: false });

        // Remove old recovery codes and insert new ones
        await trx('recovery_codes').where({ user_id: user.id }).del();
        await trx('recovery_codes').insert(hashedCodes.map(hashed_code => ({
            user_id: user.id,
            hashed_code
        })));
        
        // Generate QR code
        const appName = 'MyCalBook';
        const otpauth = authenticator.keyuri(user.email, appName, secret);
        const qrCode = await qrcode.toDataURL(otpauth);
        
        await trx.commit();
        
        // Return the QR code and the *plain-text* recovery codes for the user to save
        res.json({ secret, qrCode, recoveryCodes });

    } catch (error) {
        await trx.rollback();
        console.error('2FA Generation Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// --- POST /api/settings/2fa/verify ---
router.post('/2fa/verify', async (req, res) => {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'OTP is required.' });

    try {
        const user = await db('users').where({ id: req.user.id }).first();
        if (!user || !user.two_factor_secret) {
            return res.status(400).json({ error: '2FA has not been set up. Please generate a secret first.' });
        }

        const isValid = authenticator.check(otp, user.two_factor_secret);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
        }

        await db('users').where({ id: req.user.id }).update({ is_two_factor_enabled: true });
        res.json({ message: '2FA has been enabled successfully!' });
    } catch (error) {
        console.error('2FA Verification Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// --- POST /api/settings/2fa/disable ---
router.post('/2fa/disable', async (req, res) => {
    const { password, otp } = req.body;
    if (!password || !otp) {
        return res.status(400).json({ error: 'Password and OTP are required to disable 2FA.' });
    }

    try {
        const user = await db('users').where({ id: req.user.id }).first();
        if (!user || !user.is_two_factor_enabled) {
            return res.status(400).json({ error: '2FA is not currently enabled.' });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordMatch) {
            return res.status(401).json({ error: 'Incorrect password.' });
        }

        const isOtpValid = authenticator.check(otp, user.two_factor_secret);
        if (!isOtpValid) {
            return res.status(401).json({ error: 'Invalid OTP.' });
        }

        // Use a transaction to ensure all or nothing
        const trx = await db.transaction();
        await trx('users').where({ id: req.user.id }).update({
            two_factor_secret: null,
            is_two_factor_enabled: false,
        });
        await trx('recovery_codes').where({ user_id: req.user.id }).del();
        await trx.commit();

        res.json({ message: '2FA has been disabled.' });
    } catch (error) {
        console.error('2FA Disable Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;