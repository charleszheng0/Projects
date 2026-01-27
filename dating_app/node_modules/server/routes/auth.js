const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Will need to install this if not already
const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware to check JWT
const authenticateToken = (req, res, next) => {
    // Check cookie first, or header
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Signup
router.post('/signup', async (req, res) => {
    const { email, password, display_name, age, city, gender, interested_in } = req.body;

    // Basic validation
    if (!email || !password || !display_name || !age || !city) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO users (email, password_hash, display_name, age, city, gender, interested_in) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email, display_name`,
            [email, hashedPassword, display_name, age, city, gender, interested_in]
        );

        const user = result.rows[0];

        // Create Token
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Set Cookie
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        res.status(201).json({ user });
    } catch (err) {
        if (err.code === '23505') { // Unique violation for email
            return res.status(409).json({ error: 'Email already in use' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid password' });

        // Create Token
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Set Cookie
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        // Remove password hash from response
        delete user.password_hash;
        res.json({ user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Me (Check Auth)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];
        if (user) {
            delete user.password_hash;
            res.json({ user });
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.sendStatus(200);
});

module.exports = { router, authenticateToken };
