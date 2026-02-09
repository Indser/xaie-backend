const db = require('../config/db');

// Auto-migration helper to ensure columns exist
const ensureColumns = async () => {
    try {
        await db.query("ALTER TABLE users ADD COLUMN last_active DATETIME DEFAULT NOW()");
        await db.query("ALTER TABLE users ADD COLUMN avatar_url LONGTEXT"); // Using LONGTEXT for Base64 storage
        console.log('User columns added/verified');
    } catch (e) {
        // Ignore "Duplicate column name" error
        if (e.code !== 'ER_DUP_FIELDNAME') console.error('Migration note:', e.message);
    }
};
// Run once on load
ensureColumns();

exports.searchUsers = async (req, res) => {
    const { q } = req.query;
    const myId = req.user.id; // From auth middleware

    try {
        const [users] = await db.query(
            'SELECT id, username, avatar_url, last_active FROM users WHERE username LIKE ? AND id != ? LIMIT 10',
            [`%${q}%`, myId]
        );
        res.json(users);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, avatar_url, last_active FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(users[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

exports.updateProfile = async (req, res) => {
    const { username } = req.body;
    try {
        await db.query('UPDATE users SET username = ? WHERE id = ?', [username, req.user.id]);
        res.json({ message: 'Profile updated' });
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
};

exports.updateAvatar = async (req, res) => {
    const { avatarBase64 } = req.body;
    if (!avatarBase64) return res.status(400).json({ message: 'Image data required' });

    try {
        await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarBase64, req.user.id]);
        res.json({ message: 'Avatar updated' });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to update avatar' });
    }
};

exports.getActiveUsers = async (req, res) => {
    try {
        // Show users active in last 10 minutes
        const [users] = await db.query(
            `SELECT id, username, avatar_url, last_active 
             FROM users 
             WHERE last_active > DATE_SUB(NOW(), INTERVAL 10 MINUTE) 
             AND id != ?
             ORDER BY last_active DESC LIMIT 20`,
            [req.user.id] // Don't show self in active list
        );
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch active users' });
    }
};
