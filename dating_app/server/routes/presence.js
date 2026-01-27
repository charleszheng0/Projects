const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

// Start My Hour
router.post('/start', authenticateToken, async (req, res) => {
    const { activity_tag, status_text } = req.body;

    if (!activity_tag) {
        return res.status(400).json({ error: 'Activity tag is required' });
    }

    try {
        // End any previous active sessions for cleanliness (though logic says 1 hr fixed)
        // Actually, let's just create a new one. The constraint is "visible if session ends within last 24h"
        // But "Start My Hour" implies a current session.

        // Check if currently overlapping a session?
        // User requirement: "Create a PresenceSession with start_time = now and end_time = now + 1 hour."

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour

        const result = await db.query(
            `INSERT INTO presence_sessions (user_id, start_time, end_time, activity_tag, status_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [req.user.id, startTime, endTime, activity_tag, status_text]
        );

        res.json({ session: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Pool (Visible Users)
router.get('/pool', authenticateToken, async (req, res) => {
    try {
        // Query visible users who:
        // 1. Are not current user
        // 2. Have a presence_session that ENDED within the last 24 hours (i.e. end_time > now - 24h)
        //    Wait, "Only users with a PresenceSession that ended within the last 24 hours are considered visible"
        //    Also active sessions? Yes, if end_time is in future, it definitely ended after (now - 24h).

        // Also filter by preferences (age, interested_in) - Simple version for MVP

        // Get current user prefs first
        const currentUserRes = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const currentUser = currentUserRes.rows[0];

        // TODO: meaningful filtering based on gender/interest. For MVP showing everyone except self.

        const result = await db.query(`
      SELECT 
        u.id, u.display_name, u.age, u.city, u.gender, u.routine_tags,
        ps.activity_tag, ps.status_text, ps.end_time as session_end_time, ps.start_time as session_start_time
      FROM users u
      JOIN presence_sessions ps ON u.id = ps.user_id
      WHERE u.id != $1
      AND ps.end_time > (NOW() - INTERVAL '24 hours')
      -- Select the LATEST session for each user
      AND ps.created_at = (
        SELECT MAX(created_at) FROM presence_sessions WHERE user_id = u.id
      )
      ORDER BY ps.end_time DESC
    `, [req.user.id]);

        res.json({ users: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
