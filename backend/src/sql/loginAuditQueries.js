// src/sql/loginAuditQueries.js

const db = require('../config/db');

async function recordLoginEvent({ eventType, usernameAttempted, userId, ipAddress, userAgent }) {
    await db.query(
        `INSERT INTO login_audit_log (event_type, username_attempted, user_id, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
        [eventType, usernameAttempted, userId || null, ipAddress || null, userAgent || null]
    );
}

module.exports = { recordLoginEvent };