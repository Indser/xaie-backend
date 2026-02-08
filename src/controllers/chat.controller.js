const db = require('../config/db');

exports.sendMessage = async (req, res) => {
    const { chatId, message } = req.body;
    const userId = req.user.id;

    if (!chatId || !message) {
        return res.status(400).json({ message: 'Chat ID and message are required.' });
    }

    try {
        const [membership] = await db.execute(
            'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?',
            [chatId, userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ message: 'You are not a member of this chat.' });
        }

        const [result] = await db.execute(
            'INSERT INTO messages (chat_id, sender_id, message) VALUES (?, ?, ?)',
            [chatId, userId, message]
        );

        res.status(201).json({
            message: 'Message sent.',
            messageId: result.insertId,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({ message: 'Error sending message.', error: error.message });
    }
};

exports.fetchMessages = async (req, res) => {
    const { chatId } = req.params; // chatId comes from URL parameter
    const userId = req.user.id;

    try {
        const [membership] = await db.execute(
            'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?',
            [chatId, userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ message: 'Access denied. Not a member.' });
        }

        const [messages] = await db.execute(
            `SELECT m.id, m.message, m.sender_id, m.created_at, u.username as sender_name 
             FROM messages m 
             JOIN users u ON m.sender_id = u.id 
             WHERE m.chat_id = ? 
             ORDER BY m.created_at ASC`,
            [chatId]
        );

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages.', error: error.message });
    }
};

exports.listChats = async (req, res) => {
    const userId = req.user.id;

    try {
        const [chats] = await db.execute(
            `SELECT c.id, c.created_at 
             FROM chats c 
             JOIN chat_members cm ON c.id = cm.chat_id 
             WHERE cm.user_id = ?`,
            [userId]
        );
        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: 'Error listing chats.', error: error.message });
    }
};

exports.createChat = async (req, res) => {
    const userId = req.user.id;
    const { targetUserId } = req.body;
    try {
        const [chatResult] = await db.execute('INSERT INTO chats () VALUES ()');
        const chatId = chatResult.insertId;

        await db.execute(
            'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)',
            [chatId, userId]
        );

        if (targetUserId) {
            await db.execute(
                'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)',
                [chatId, targetUserId]
            );
        }

        res.status(201).json({ message: 'Chat created.', id: chatId });
    } catch (error) {
        res.status(500).json({ message: 'Error creating chat.', error: error.message });
    }
};

exports.joinChat = async (req, res) => {
    const { chatId } = req.body;
    const userId = req.user.id;

    try {
        await db.execute(
            'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)',
            [chatId, userId]
        );
        res.json({ message: 'Joined chat.' });
    } catch (error) {
        res.status(500).json({ message: 'Error joining chat.', error: error.message });
    }
};

exports.deleteMessage = async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.id;

    try {
        const [result] = await db.execute(
            'DELETE FROM messages WHERE id = ? AND sender_id = ?',
            [messageId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Message not found or unauthorized' });
        }

        res.json({ message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting message', error: error.message });
    }
};

exports.getChatDetails = async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;

    try {
        const [members] = await db.execute(
            `SELECT u.username, u.id 
             FROM chat_members cm 
             JOIN users u ON cm.user_id = u.id 
             WHERE cm.chat_id = ? AND cm.user_id != ?`,
            [chatId, userId]
        );

        if (members.length === 0) {
            // Might be a group or self-chat
            return res.json({ username: 'Chat Room', isGroup: true });
        }

        res.json({
            username: members[0].username,
            id: members[0].id,
            isGroup: members.length > 1
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat details', error: error.message });
    }
};

exports.reactToMessage = async (req, res) => {
    const { messageId } = req.params;
    const { reaction } = req.body;
    const userId = req.user.id;

    if (!reaction) return res.status(400).json({ message: 'Reaction is required' });

    try {
        await db.execute(
            'INSERT INTO message_reactions (message_id, user_id, reaction) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reaction = ?',
            [messageId, userId, reaction, reaction]
        );
        res.json({ message: 'Reaction added' });
    } catch (error) {
        res.status(500).json({ message: 'Error reacting to message', error: error.message });
    }
};
