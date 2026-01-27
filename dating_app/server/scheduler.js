const db = require('./db');

const closeExpiredWindows = async () => {
    try {
        // Find active windows that have passed their end_time
        // Mark them as 'closed'
        const result = await db.query(
            `UPDATE shared_windows 
       SET status = 'closed' 
       WHERE status = 'active' AND end_time < NOW()
       RETURNING id`
        );

        if (result.rowCount > 0) {
            console.log(`Scheduler: Closed ${result.rowCount} expired windows.`);
        }
    } catch (err) {
        console.error('Scheduler Error:', err);
    }
};

const startScheduler = () => {
    // Run every minute for MVP
    setInterval(closeExpiredWindows, 60 * 1000);
    console.log('Scheduler started: Checking for expired windows every minute.');
};

module.exports = { startScheduler };
