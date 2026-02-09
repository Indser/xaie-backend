-- Database Schema for XAIE Chat

CREATE DATABASE IF NOT EXISTS xaie_chat;
USE xaie_chat;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255) DEFAULT NULL,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chats Table
CREATE TABLE IF NOT EXISTS chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) DEFAULT NULL,
    type ENUM('dm', 'group', 'public') DEFAULT 'dm',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Members Table (links users to chats)
CREATE TABLE IF NOT EXISTS chat_members (
    chat_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chat_id, user_id),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Message Reactions Table
CREATE TABLE IF NOT EXISTS message_reactions (
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    reaction VARCHAR(20) NOT NULL,
    PRIMARY KEY (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
