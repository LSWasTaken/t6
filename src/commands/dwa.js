const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dwa')
        .setDescription('Disable weekly Formula 1 alerts and news updates in this channel'),

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

            // Get current settings
            const weeklySettings = await db.getChannelSetting(interaction.channelId, 'weeklyAlerts');
            const newsSettings = await db.getChannelSetting(interaction.channelId, 'newsUpdates');
            
            if ((!weeklySettings || !weeklySettings.enabled) && (!newsSettings || !newsSettings.enabled)) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('No alerts are currently enabled in this channel.')],
                    ephemeral: true
                });
            }

            // Disable weekly alerts
            if (weeklySettings?.enabled) {
                await db.setChannelSetting(interaction.channelId, 'weeklyAlerts', {
                    enabled: false,
                    lastNotified: weeklySettings.lastNotified,
                    nextNotification: null
                });
            }

            // Disable news updates
            if (newsSettings?.enabled) {
                await db.setChannelSetting(interaction.channelId, 'newsUpdates', {
                    enabled: false,
                    lastNotified: newsSettings.lastNotified,
                    nextNotification: null,
                    apiKey: newsSettings.apiKey
                });
            }

            await interaction.editReply({
                embeds: [{
                    color: 0xFF0000,
                    title: '📅 Alerts Disabled',
                    description: 'This channel will no longer receive Formula 1 updates.',
                    fields: [
                        {
                            name: 'ℹ️ Information',
                            value: [
                                '• All scheduled alerts have been cancelled',
                                '• You can re-enable alerts anytime using /ewa',
                                '• Channel settings have been preserved'
                            ].join('\n')
                        }
                    ],
                    footer: {
                        text: 'Use /ewa to re-enable alerts',
                        iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                    }
                }],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in /dwa command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while disabling alerts. Please try again later.')],
                ephemeral: true
            });
        }
    },
}; 