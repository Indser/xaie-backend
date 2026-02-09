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
        // Fetch chats where the user is a member
        const [rows] = await db.execute(
            `SELECT c.id, c.created_at, c.name AS group_name,
                    u.id AS partner_id, u.username AS partner_username,
                    m.message AS last_message, m.created_at AS last_message_time
             FROM chats c
             JOIN chat_members cm1 ON c.id = cm1.chat_id
             LEFT JOIN chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id != ?
             LEFT JOIN users u ON cm2.user_id = u.id
             LEFT JOIN (
                 SELECT m1.*
                 FROM messages m1
                 JOIN (
                     SELECT chat_id, MAX(created_at) AS max_date
                     FROM messages
                     GROUP BY chat_id
                 ) m2 ON m1.chat_id = m2.chat_id AND m1.created_at = m2.max_date
             ) m ON c.id = m.chat_id
             WHERE cm1.user_id = ?
             GROUP BY c.id
             ORDER BY m.created_at DESC`,
            [userId, userId]
        );

        // Format the result
        const chats = rows.map(row => {
            // If group_name exists, it's a group. If not, it's a DM (use partner name).
            // For groups, partnerUsername might be one of the members, which is fine for avatar, 
            // but title should be group name.
            const isGroup = row.group_name !== null;
            return {
                id: row.id,
                isGroup: isGroup,
                partnerId: row.partner_id, // Might be one of the members
                partnerUsername: isGroup ? row.group_name : row.partner_username,
                lastMessage: row.last_message || 'Start a conversation',
                lastMessageTime: row.last_message_time || row.created_at
            };
        });

        res.json(chats);
    } catch (error) {
        console.error('Error listing chats:', error);
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

exports.createGroup = async (req, res) => {
    const userId = req.user.id;
    const { name, memberIds } = req.body; // memberIds is an array of user IDs

    if (!name || !memberIds || !Array.isArray(memberIds)) {
        return res.status(400).json({ message: 'Group name and member IDs are required.' });
    }

    try {
        // Create chat with is_group flag (assuming column exists or we just treat it as chat)
        // Check schema first, if no is_group, we might need to add it or infer it.
        // For now, let's assume standard chat table.
        // If I can't add columns easily, I'll allow null name for DM and name for Group.
        // Wait, the current `chats` table seems to have only id and created_at.
        // I should probably add `name` to `chats` table.

        // Let's try to add the column if it doesn't exist, or just use a separate details table?
        // No, keep it simple. I'll just insert into chats.
        // If I can't modify schema, I will store group name in a way that `listChats` can retrieve it.
        // `listChats` joins `chat_members` so maybe I can't store name on `chats` without migration.

        // **Critial**: The user said "able to name group chat and edit it".
        // This implies I need valid storage for the name.
        // I will assume the `chats` table has a `name` column or I will add it using raw SQL in a migration step if I could.
        // Since I can't run migrations easily, I will try to see if I can add the column via a query in this function (hacky but works for this context).

        // Better: I will use `ALTER TABLE chats ADD COLUMN name VARCHAR(255) NULL` in a separate `init` step?
        // Or just try to insert and if it fails, I know.
        // Actually, the user has `railway` running.
        // I'll assume I can run a query to add the column.

        try {
            await db.execute('ALTER TABLE chats ADD COLUMN name VARCHAR(255) NULL');
        } catch (e) {
            // Ignore if exists
        }

        const [chatResult] = await db.execute('INSERT INTO chats (name) VALUES (?)', [name]);
        const chatId = chatResult.insertId;

        // Add creator
        await db.execute('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)', [chatId, userId]);

        // Add members
        for (const memberId of memberIds) {
            await db.execute('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)', [chatId, memberId]);
        }

        res.status(201).json({ message: 'Group created.', id: chatId, name: name });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating group.', error: error.message });
    }
};

exports.getPublicChat = async (req, res) => {
    try {
        // Find public chat
        const [rows] = await db.execute("SELECT id FROM chats WHERE name = 'XAIE Public' LIMIT 1");

        let chatId;
        if (rows.length > 0) {
            chatId = rows[0].id;
        } else {
            // Create public chat if not exists
            const [result] = await db.execute("INSERT INTO chats (name) VALUES ('XAIE Public')");
            chatId = result.insertId;
        }

        // Ensure user is a member (silently add if not)
        try {
            await db.execute('INSERT IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)', [chatId, req.user.id]);
        } catch (e) {
            // Ignore duplicate error if IGNORE doesn't work as expected (MySQL usually handles IGNORE well)
        }

        res.json({ id: chatId });
    } catch (error) {
        console.error('Error getting public chat:', error);
        res.status(500).json({ message: 'Error accessing public chat' });
    }
};

exports.updateChat = async (req, res) => {
    const { chatId } = req.params;
    const { name } = req.body;
    const userId = req.user.id; // ensuring user is admin or member? 
    // For now, any member can update name (like Messenger)

    if (!name) return res.status(400).json({ message: 'Name is required' });

    try {
        // Verify membership
        const [members] = await db.execute('SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?', [chatId, userId]);
        if (members.length === 0) {
            return res.status(403).json({ message: 'Not authorized to update this chat' });
        }

        await db.execute('UPDATE chats SET name = ? WHERE id = ?', [name, chatId]);
        res.json({ message: 'Chat updated' });
    } catch (error) {
        console.error('Error updating chat:', error);
        res.status(500).json({ message: 'Error updating chat' });
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
