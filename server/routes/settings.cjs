const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/auth.cjs');

// Protect all routes in this file
router.use(authMiddleware);

// --- GET /api/settings ---
// Fetches the current user's settings
router.get('/', async (req, res) => {
    try {
        const user = await db('users').where({ id: req.user.id }).first('email', 'username', 'email_notifications');
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
// Updates general user settings (like the email toggle)
router.put('/', async (req, res) => {
    const { email_notifications } = req.body;

    // We only allow updating specific fields this way.
    const updates = {};
    if (typeof email_notifications === 'boolean') {
        updates.email_notifications = email_notifications;
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update.' });
    }

    try {
        const [updatedUser] = await db('users')
            .where({ id: req.user.id })
            .update(updates)
            .returning(['email', 'username', 'email_notifications']);
        
        res.json({ message: 'Settings updated successfully.', settings: updatedUser });
    } catch (error) {
        console.error("Error updating user settings:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// --- PUT /api/settings/password ---
// A dedicated endpoint for changing the password
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
        // 1. Get the user's current password hash
        const user = await db('users').where({ id: req.user.id }).first('password_hash');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // 2. Compare the provided current password with the stored hash
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect current password.' });
        }

        // 3. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // 4. Update the user's password in the database
        await db('users').where({ id: req.user.id }).update({ password_hash: newPasswordHash });

        res.json({ message: 'Password updated successfully.' });

    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// --- DELETE /api/settings/account ---
// A dedicated endpoint for a user to delete their own account
router.delete('/account', async (req, res) => {
    const userId = req.user.id;

    try {
        // The ON DELETE CASCADE in the DB schema handles cleaning up related data
        await db('users').where({ id: userId }).del();
        res.json({ message: 'Account deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting account for user ${userId}:`, error);
        res.status(500).json({ error: 'Internal server error during account deletion.' });
    }
});


module.exports = router;