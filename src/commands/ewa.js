const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ewa')
        .setDescription('Enable weekly Formula 1 alerts and 6-hour news updates in this channel'),

    async execute(interaction) {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({
                    embeds: [createErrorEmbed('You need Administrator permissions to use this command.')],
                    ephemeral: true
                });
            }

            await interaction.reply({
                embeds: [createLoadingEmbed()],
                ephemeral: true
            });

            // Store channel settings in database
            await db.setChannelSetting(interaction.channelId, 'weeklyAlerts', {
                enabled: true,
                lastNotified: null,
                nextNotification: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
            });

            // Store news update settings
            await db.setChannelSetting(interaction.channelId, 'newsUpdates', {
                enabled: true,
                lastNotified: null,
                nextNotification: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
                apiKey: '49f2327b01msh0cfd1d4ce87b822p1b277ajsn8647480f4000'
            });

            // Get user's timezone for the next notification time
            const userTimezone = await db.getUserSetting(interaction.user.id, 'timezone') || 'UTC';
            const nextWeeklyNotification = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const nextNewsNotification = new Date(Date.now() + 6 * 60 * 60 * 1000);

            const formatTime = (date) => {
                return new Intl.DateTimeFormat('en-US', {
                    timeZone: userTimezone,
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    timeZoneName: 'long'
                }).format(date);
            };

            await interaction.editReply({
                embeds: [{
                    color: 0x00FF00,
                    title: '📅 Alerts Enabled',
                    description: 'This channel will now receive Formula 1 updates.',
                    fields: [
                        {
                            name: '📢 Weekly Updates',
                            value: [
                                '• Upcoming race schedule',
                                '• Driver and team updates',
                                '• Track information',
                                '• Weather forecasts',
                                '• Session timings'
                            ].join('\n')
                        },
                        {
                            name: '📰 News Updates (Every 6 Hours)',
                            value: [
                                '• Latest F1 news and rumors',
                                '• Team announcements',
                                '• Driver interviews',
                                '• Technical updates',
                                '• Breaking news'
                            ].join('\n')
                        },
                        {
                            name: '⏰ Next Notifications',
                            value: [
                                `**Weekly Update:** ${formatTime(nextWeeklyNotification)}`,
                                `**News Update:** ${formatTime(nextNewsNotification)}`
                            ].join('\n')
                        }
                    ],
                    footer: {
                        text: 'Use /dwa to disable all alerts',
                        iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                    }
                }],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in /ewa command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while enabling alerts. Please try again later.')],
                ephemeral: true
            });
        }
    },
}; 