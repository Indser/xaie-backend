
const jwt = require('jsonwebtoken');

exports.generateToken = (user) => {
    return jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '7d' });
};

exports.verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
};
