const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB Atlas connection URL with authentication
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'f1bot';

let client;
let db;

// Connect to MongoDB with proper security options
async function connect() {
    if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set');
    }

    try {
        const options = {
            maxPoolSize: 10,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            ssl: true,
            authSource: 'admin',
            retryWrites: true,
            w: 'majority',
            // Restrict operations
            readPreference: 'primary',
            writeConcern: { w: 'majority' }
        };

        client = new MongoClient(uri, options);
        await client.connect();
        db = client.db(dbName);
        
        // Verify connection and permissions
        await verifyDatabaseAccess();
        console.log('Connected to MongoDB Atlas with proper privileges');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

// Verify database access and permissions
async function verifyDatabaseAccess() {
    try {
        // Test read access
        await db.command({ ping: 1 });
        
        // Test write access with proper error handling
        const testCollection = db.collection('_test_access');
        try {
            // Test insert
            await testCollection.insertOne({ 
                test: true, 
                timestamp: new Date(),
                operation: 'insert'
            });
            
            // Test update
            await testCollection.updateOne(
                { test: true },
                { $set: { operation: 'update' } }
            );
            
            // Test delete
            await testCollection.deleteOne({ test: true });
            
            // Test index creation
            await testCollection.createIndex({ timestamp: 1 });
        } finally {
            // Clean up test collection
            await testCollection.drop().catch(() => {});
        }
    } catch (error) {
        console.error('Database access verification failed:', error);
        throw new Error('Insufficient database privileges');
    }
}

// Initialize collections with proper indexes and validation
async function initializeCollections() {
    try {
        // Create collections if they don't exist
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        // Channel Settings Collection
        if (!collectionNames.includes('channel_settings')) {
            await db.createCollection('channel_settings', {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['channel_id', 'settings'],
                        properties: {
                            channel_id: { 
                                bsonType: 'string',
                                description: 'Discord channel ID'
                            },
                            settings: { 
                                bsonType: 'object',
                                description: 'Channel settings'
                            },
                            updated_at: { 
                                bsonType: 'date',
                                description: 'Last update timestamp'
                            }
                        }
                    }
                },
                validationAction: 'error'
            });

            // Create indexes for channel_settings
            await db.collection('channel_settings').createIndex(
                { channel_id: 1 }, 
                { unique: true, name: 'channel_id_unique' }
            );
            await db.collection('channel_settings').createIndex(
                { 'settings.weeklyAlerts': 1 },
                { name: 'weekly_alerts_idx' }
            );
            await db.collection('channel_settings').createIndex(
                { 'settings.autoEvents': 1 },
                { name: 'auto_events_idx' }
            );
            await db.collection('channel_settings').createIndex(
                { updated_at: 1 },
                { name: 'updated_at_idx' }
            );
        }

        // User Settings Collection
        if (!collectionNames.includes('user_settings')) {
            await db.createCollection('user_settings', {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['user_id', 'settings'],
                        properties: {
                            user_id: { 
                                bsonType: 'string',
                                description: 'Discord user ID'
                            },
                            settings: { 
                                bsonType: 'object',
                                description: 'User settings'
                            },
                            updated_at: { 
                                bsonType: 'date',
                                description: 'Last update timestamp'
                            }
                        }
                    }
                },
                validationAction: 'error'
            });

            // Create indexes for user_settings
            await db.collection('user_settings').createIndex(
                { user_id: 1 }, 
                { unique: true, name: 'user_id_unique' }
            );
            await db.collection('user_settings').createIndex(
                { 'settings.timezone': 1 },
                { name: 'timezone_idx' }
            );
            await db.collection('user_settings').createIndex(
                { updated_at: 1 },
                { name: 'updated_at_idx' }
            );
        }
    } catch (error) {
        console.error('Error initializing collections:', error);
        throw error;
    }
}

// Channel Settings Functions with proper error handling
async function getChannelSetting(channelId, key, defaultValue = null) {
    try {
        const result = await db.collection('channel_settings').findOne(
            { channel_id: channelId },
            { 
                projection: { [`settings.${key}`]: 1 },
                readPreference: 'primary'
            }
        );
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
            { 
                $set: { 
                    [`settings.${key}`]: value,
                    updated_at: new Date()
                }
            },
            { 
                upsert: true,
                writeConcern: { w: 'majority' }
            }
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
            { 
                $unset: { [`settings.${key}`]: "" },
                $set: { updated_at: new Date() }
            },
            { writeConcern: { w: 'majority' } }
        );
    } catch (error) {
        console.error('Error deleting channel setting:', error);
        throw error;
    }
}

// User Settings Functions with proper error handling
async function getUserSetting(userId, key, defaultValue = null) {
    try {
        const result = await db.collection('user_settings').findOne(
            { user_id: userId },
            { 
                projection: { [`settings.${key}`]: 1 },
                readPreference: 'primary'
            }
        );
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
            { 
                $set: { 
                    [`settings.${key}`]: value,
                    updated_at: new Date()
                }
            },
            { 
                upsert: true,
                writeConcern: { w: 'majority' }
            }
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
            { 
                $unset: { [`settings.${key}`]: "" },
                $set: { updated_at: new Date() }
            },
            { writeConcern: { w: 'majority' } }
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