const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dautoevent')
        .setDescription('Disable automatic Discord events and race notifications for Formula 1 sessions'),

    async execute(interaction) {
        try {
            // Check if user has permission to manage events
            if (!interaction.member.permissions.has('ManageEvents')) {
                return interaction.reply({
                    embeds: [createErrorEmbed('You need the "Manage Events" permission to use this command.')],
                    ephemeral: true
                });
            }

            await interaction.reply({
                embeds: [createLoadingEmbed()],
                ephemeral: true
            });

            // Get current settings
            const currentSettings = await db.getChannelSetting(interaction.channelId, 'autoEvents');
            
            if (!currentSettings || !currentSettings.enabled) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Automatic events and notifications are not enabled in this channel.')],
                    ephemeral: true
                });
            }

            // Store guild setting in database
            await db.setChannelSetting(interaction.channelId, 'autoEvents', {
                enabled: false,
                lastCreated: currentSettings.lastCreated,
                nextEvent: null,
                createdEvents: currentSettings.createdEvents,
                notificationChannelId: currentSettings.notificationChannelId,
                schedule: currentSettings.schedule
            });

            await interaction.editReply({
                embeds: [{
                    color: 0xFF0000,
                    title: '📅 Automatic Events Disabled',
                    description: 'Discord events and race notifications have been disabled.',
                    fields: [
                        {
                            name: 'ℹ️ Information',
                            value: [
                                '• No new events will be created',
                                '• No more race notifications will be sent',
                                '• Existing events will remain',
                                '• You can re-enable events anytime using /eautoevent',
                                '• Channel settings have been preserved'
                            ].join('\n')
                        }
                    ],
                    footer: {
                        text: 'Use /eautoevent to re-enable automatic events',
                        iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                    }
                }],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in /dautoevent command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while disabling automatic events. Please try again later.')],
                ephemeral: true
            });
        }
    },
}; 