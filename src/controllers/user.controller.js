const db = require('../config/db');

exports.searchUsers = async (req, res) => {
    const { q } = req.query;
    const myId = req.user.id; // From auth middleware

    try {
        const [users] = await db.query(
            'SELECT id, username FROM users WHERE username LIKE ? AND id != ? LIMIT 10',
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
        const [users] = await db.query('SELECT id, username FROM users WHERE id = ?', [req.user.id]);
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

exports.getActiveUsers = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, username FROM users ORDER BY created_at DESC LIMIT 10'
        );
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch active users' });
    }
};
