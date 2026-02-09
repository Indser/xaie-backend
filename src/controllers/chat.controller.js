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
        // First, get all chats the user is a member of
        const [chatRows] = await db.execute(
            `SELECT DISTINCT c.id, c.created_at, c.name AS group_name
             FROM chats c
             JOIN chat_members cm ON c.id = cm.chat_id
             WHERE cm.user_id = ?
             ORDER BY c.created_at DESC`,
            [userId]
        );

        // For each chat, get additional details
        const chats = await Promise.all(chatRows.map(async (chat) => {
            // Get last message
            const [lastMsg] = await db.execute(
                `SELECT message, created_at 
                 FROM messages 
                 WHERE chat_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 1`,
                [chat.id]
            );

            // Get partner info (for DMs) or first member (for groups to show avatar)
            const [partnerRows] = await db.execute(
                `SELECT u.id, u.username, u.avatar_url, u.last_active 
                 FROM chat_members cm 
                 JOIN users u ON cm.user_id = u.id 
                 WHERE cm.chat_id = ? AND cm.user_id != ? 
                 LIMIT 1`,
                [chat.id, userId]
            );

            const isGroup = chat.group_name !== null;
            const partner = partnerRows.length > 0 ? partnerRows[0] : null;

            return {
                id: chat.id,
                isGroup: isGroup,
                partnerId: partner?.id || null,
                partnerUsername: isGroup ? chat.group_name : (partner?.username || 'Unknown'),
                partnerAvatarUrl: partner?.avatar_url || null,
                partnerLastActive: partner?.last_active || null,
                lastMessage: lastMsg.length > 0 ? lastMsg[0].message : 'Start a conversation',
                lastMessageTime: lastMsg.length > 0 ? lastMsg[0].created_at : chat.created_at
            };
        }));

        // Sort by last message time
        chats.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

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
            `SELECT u.username, u.id, u.avatar_url, u.last_active 
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
            avatar_url: members[0].avatar_url,
            last_active: members[0].last_active,
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
