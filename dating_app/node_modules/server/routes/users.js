const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

// Update Profile
router.put('/profile', authenticateToken, async (req, res) => {
    const { display_name, city, routine_tags, min_age_preference, max_age_preference, max_distance_km } = req.body;

    try {
        const result = await db.query(
            `UPDATE users 
       SET display_name = COALESCE($1, display_name),
           city = COALESCE($2, city),
           routine_tags = COALESCE($3, routine_tags),
           min_age_preference = COALESCE($4, min_age_preference),
           max_age_preference = COALESCE($5, max_age_preference),
           max_distance_km = COALESCE($6, max_distance_km),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
            [display_name, city, routine_tags, min_age_preference, max_age_preference, max_distance_km, req.user.id]
        );

        const user = result.rows[0];
        delete user.password_hash;
        res.json({ user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
