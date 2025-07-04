const express = require('express');
const router = express.Router();
const db = require('../db/knex.cjs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ensure you have a JWT_SECRET in your environment variables.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined.");
}

// --- User Registration ---
// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    try {
        // Check if user already exists
        const existingUser = await db('users').where({ email }).orWhere({ username }).first();
        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already exists.' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create the new user
        const [newUser] = await db('users').insert({ username, email, password_hash }).returning(['id', 'username', 'email']);
        
        // Don't log the user in automatically on register, make them log in.
        res.status(201).json({ message: 'User registered successfully. You may log in now.', user: newUser });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
});


// --- User Login ---
// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // Find the user by email
        const user = await db('users').where({ email }).first();
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' }); // Generic error
        }

        // Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' }); // Generic error
        }

        // Create JWT Payload
        const payload = {
            user: {
                id: user.id,
                username: user.username,
                is_admin: user.is_admin,
            }
        };

        // Sign the token
        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '30d' }, // Token expires in 30 days
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
});


module.exports = router;