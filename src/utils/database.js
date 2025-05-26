const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB connection URL
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'f1bot';

let client;
let db;

// Connect to MongoDB
async function connect() {
    try {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db(dbName);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

// Initialize collections
async function initializeCollections() {
    try {
        // Create collections if they don't exist
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        if (!collectionNames.includes('channel_settings')) {
            await db.createCollection('channel_settings');
            await db.collection('channel_settings').createIndex({ channel_id: 1 }, { unique: true });
        }

        if (!collectionNames.includes('user_settings')) {
            await db.createCollection('user_settings');
            await db.collection('user_settings').createIndex({ user_id: 1 }, { unique: true });
        }
    } catch (error) {
        console.error('Error initializing collections:', error);
        throw error;
    }
}

// Channel Settings Functions
async function getChannelSetting(channelId, key, defaultValue = null) {
    try {
        const result = await db.collection('channel_settings').findOne({ channel_id: channelId });
        if (!result) return defaultValue;
        return result.settings[key] ?? defaultValue;
    } catch (error) {
        console.error('Error getting channel setting:', error);
        throw error;
    }
}

async function setChannelSetting(channelId, key, value) {
    try {
        await db.collection('channel_settings').updateOne(
            { channel_id: channelId },
            { $set: { [`settings.${key}`]: value } },
            { upsert: true }
        );
    } catch (error) {
        console.error('Error setting channel setting:', error);
        throw error;
    }
}

async function deleteChannelSetting(channelId, key) {
    try {
        await db.collection('channel_settings').updateOne(
            { channel_id: channelId },
            { $unset: { [`settings.${key}`]: "" } }
        );
    } catch (error) {
        console.error('Error deleting channel setting:', error);
        throw error;
    }
}

// User Settings Functions
async function getUserSetting(userId, key, defaultValue = null) {
    try {
        const result = await db.collection('user_settings').findOne({ user_id: userId });
        if (!result) return defaultValue;
        return result.settings[key] ?? defaultValue;
    } catch (error) {
        console.error('Error getting user setting:', error);
        throw error;
    }
}

async function setUserSetting(userId, key, value) {
    try {
        await db.collection('user_settings').updateOne(
            { user_id: userId },
            { $set: { [`settings.${key}`]: value } },
            { upsert: true }
        );
    } catch (error) {
        console.error('Error setting user setting:', error);
        throw error;
    }
}

async function deleteUserSetting(userId, key) {
    try {
        await db.collection('user_settings').updateOne(
            { user_id: userId },
            { $unset: { [`settings.${key}`]: "" } }
        );
    } catch (error) {
        console.error('Error deleting user setting:', error);
        throw error;
    }
}

// Initialize database connection
connect().then(() => {
    initializeCollections().catch(console.error);
}).catch(console.error);

// Export all functions
module.exports = {
    getChannelSetting,
    setChannelSetting,
    deleteChannelSetting,
    getUserSetting,
    setUserSetting,
    deleteUserSetting
}; 