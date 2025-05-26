const { ActivityType } = require('discord.js');

function updatePresence(client) {
    client.user.setPresence({
        activities: [{
            name: 'Formula 1',
            type: ActivityType.Watching,
            state: 'Live Race',
            details: 'Following the action',
            timestamps: {
                start: Date.now()
            },
            assets: {
                largeImageKey: 'f1_logo',
                largeText: 'Formula 1',
                smallImageKey: 'status_live',
                smallText: 'Live'
            },
            party: {
                id: 'f1_party',
                size: [1, 20]
            }
        }],
        status: 'online'
    });
}

module.exports = { updatePresence }; 