const { verifyToken } = require('../utils/jwt');
const db = require('../config/db');

module.exports = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded;

        // Update last_active timestamp (non-blocking)
        db.query('UPDATE users SET last_active = NOW() WHERE id = ?', [decoded.id])
            .catch(err => {
                // Ignore error if column missing, will be added by controller
                if (err.code !== 'ER_BAD_FIELD_ERROR') console.error('Error updating last_active:', err.message);
            });

        next();
    } catch (e) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};
