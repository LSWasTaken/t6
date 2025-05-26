const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eautoevent')
        .setDescription('Enable automatic Discord events and race notifications for Formula 1 sessions')
        .addChannelOption(option =>
            option.setName('notification_channel')
                .setDescription('Channel where race notifications will be sent')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)),

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

            const notificationChannel = interaction.options.getChannel('notification_channel');

            // Fetch 2025 F1 schedule
            const response = await fetch('https://api.jolpi.ca/ergast/f1/2025/races/?format=json');
            if (!response.ok) {
                throw new Error('Failed to fetch F1 schedule');
            }

            const data = await response.json();
            if (!data?.MRData?.RaceTable?.Races) {
                throw new Error('Invalid schedule data received');
            }

            // Store guild settings in database
            await db.setChannelSetting(interaction.channelId, 'autoEvents', {
                enabled: true,
                lastCreated: null,
                nextEvent: null,
                createdEvents: [],
                notificationChannelId: notificationChannel.id,
                schedule: data.MRData.RaceTable.Races
            });

            // Get next race
            const now = new Date();
            const nextRace = data.MRData.RaceTable.Races.find(race => {
                const raceDate = new Date(`${race.date}T${race.time}`);
                return raceDate > now;
            });

            const formatTime = (date, time) => {
                return new Date(`${date}T${time}`).toLocaleString('en-US', {
                    timeZone: 'UTC',
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    timeZoneName: 'short'
                });
            };

            await interaction.editReply({
                embeds: [{
                    color: 0x00FF00,
                    title: '📅 Automatic Events Enabled',
                    description: 'Discord events and race notifications have been enabled.',
                    fields: [
                        {
                            name: '📢 What to Expect',
                            value: [
                                '• Practice sessions',
                                '• Qualifying sessions',
                                '• Sprint sessions',
                                '• Race sessions',
                                '• @everyone pings in notification channel'
                            ].join('\n')
                        },
                        {
                            name: '⚙️ Event Details',
                            value: [
                                '• Events created 24 hours before each session',
                                '• Includes session type and circuit information',
                                '• Automatic reminders at 1 hour and 15 minutes before',
                                '• Events are created in this channel',
                                `• Notifications will be sent to ${notificationChannel}`
                            ].join('\n')
                        },
                        {
                            name: '🏎️ Next Race',
                            value: nextRace ? [
                                `**${nextRace.raceName}**`,
                                `• Date: ${formatTime(nextRace.date, nextRace.time)}`,
                                `• Circuit: ${nextRace.Circuit.circuitName}`,
                                `• Location: ${nextRace.Circuit.Location.locality}, ${nextRace.Circuit.Location.country}`
                            ].join('\n') : 'No upcoming races found'
                        }
                    ],
                    footer: {
                        text: 'Use /dautoevent to disable automatic events',
                        iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                    }
                }],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in /eautoevent command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while enabling automatic events. Please try again later.')],
                ephemeral: true
            });
        }
    },
}; 