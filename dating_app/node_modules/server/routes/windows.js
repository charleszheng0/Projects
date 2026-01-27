const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

// Create Shared Window (Open connection)
router.post('/', authenticateToken, async (req, res) => {
    const { target_user_id } = req.body;
    const current_user_id = req.user.id;

    try {
        // Check if window already exists
        const existing = await db.query(
            `SELECT * FROM shared_windows 
       WHERE (user_a_id = $1 AND user_b_id = $2) 
          OR (user_a_id = $2 AND user_b_id = $1)
       AND status = 'active'`,
            [current_user_id, target_user_id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Active window already exists' });
        }

        // Create new window
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + 48 * 60 * 60 * 1000); // +48 hours

        const result = await db.query(
            `INSERT INTO shared_windows (user_a_id, user_b_id, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
            [current_user_id, target_user_id, startTime, endTime]
        );

        res.json({ window: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// List Active Windows
router.get('/active', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
      SELECT sw.*, 
        ua.display_name as user_a_name, ub.display_name as user_b_name
      FROM shared_windows sw
      JOIN users ua ON sw.user_a_id = ua.id
      JOIN users ub ON sw.user_b_id = ub.id
      WHERE (sw.user_a_id = $1 OR sw.user_b_id = $1)
      AND sw.status = 'active'
      ORDER BY sw.end_time ASC
    `, [req.user.id]);

        // Process names to show "The Other Person" easily
        const windows = result.rows.map(w => {
            const isUserA = w.user_a_id === req.user.id;
            return {
                ...w,
                partner_name: isUserA ? w.user_b_name : w.user_a_name,
                partner_id: isUserA ? w.user_b_id : w.user_a_id
            };
        });

        res.json({ windows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Window Details + Messages
router.get('/:id', authenticateToken, async (req, res) => {
    const windowId = req.params.id;
    try {
        // Validate access
        const windowRes = await db.query(
            `SELECT * FROM shared_windows WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)`,
            [windowId, req.user.id]
        );

        if (windowRes.rows.length === 0) return res.sendStatus(403);
        const window = windowRes.rows[0];

        // Fetch messages
        const messagesRes = await db.query(
            `SELECT m.*, u.display_name as sender_name 
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.window_id = $1
       ORDER BY m.created_at ASC`,
            [windowId]
        );

        res.json({ window, messages: messagesRes.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Send Message
router.post('/:id/messages', authenticateToken, async (req, res) => {
    const windowId = req.params.id;
    const { body } = req.body;

    try {
        // Validate access & status
        const windowRes = await db.query(
            `SELECT * FROM shared_windows WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)`,
            [windowId, req.user.id]
        );

        if (windowRes.rows.length === 0) return res.sendStatus(403);
        const window = windowRes.rows[0];

        if (window.status !== 'active') return res.status(400).json({ error: 'Window is closed' });
        if (new Date() > new Date(window.end_time)) return res.status(400).json({ error: 'Window expired' });

        // Rate Limit Check (Simplest: 5 messages per day)
        // Actually, prompt says "5 messages per day PER WINDOW".
        const msgCount = await db.query(
            `SELECT COUNT(*) FROM messages 
       WHERE window_id = $1 AND sender_id = $2
       AND created_at > (NOW() - INTERVAL '24 hours')`,
            [windowId, req.user.id]
        );

        if (parseInt(msgCount.rows[0].count) >= 5) {
            return res.status(429).json({ error: 'Daily message limit reached' });
        }

        // Send
        const result = await db.query(
            `INSERT INTO messages (window_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [windowId, req.user.id, body]
        );

        res.json({ message: result.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
