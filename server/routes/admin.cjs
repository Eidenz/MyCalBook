const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const authMiddleware = require('../middleware/auth.cjs');
const adminMiddleware = require('../middleware/admin.cjs');

// Protect all routes in this file with both auth and admin checks
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/users
// Fetches a list of all users
router.get('/users', async (req, res) => {
    try {
        const users = await db('users')
            .select('id', 'username', 'email', 'is_admin', 'created_at')
            .orderBy('created_at', 'desc');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users for admin:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// DELETE /api/admin/users/:id
// Deletes a user by their ID
router.delete('/users/:id', async (req, res) => {
    const userIdToDelete = parseInt(req.params.id, 10);
    const adminUserId = req.user.id;

    // A safety check to prevent an admin from deleting their own account via this panel
    if (userIdToDelete === adminUserId) {
        return res.status(400).json({ error: 'Admins cannot delete their own account from this panel.' });
    }

    try {
        const user = await db('users').where({ id: userIdToDelete }).first();
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // The ON DELETE CASCADE in the database schema will handle cleanup of related data
        await db('users').where({ id: userIdToDelete }).del();
        
        res.json({ message: `User '${user.username}' has been successfully deleted.` });
    } catch (error) {
        console.error(`Error deleting user ${userIdToDelete} by admin ${adminUserId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;