const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const db = require('../utils/database');

// Common timezone options
const COMMON_TIMEZONES = [
    { name: 'UTC', value: 'UTC' },
    { name: 'Eastern Time (ET)', value: 'America/New_York' },
    { name: 'Central Time (CT)', value: 'America/Chicago' },
    { name: 'Mountain Time (MT)', value: 'America/Denver' },
    { name: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
    { name: 'London (GMT/BST)', value: 'Europe/London' },
    { name: 'Central European Time (CET)', value: 'Europe/Paris' },
    { name: 'Moscow Time (MSK)', value: 'Europe/Moscow' },
    { name: 'Japan Time (JST)', value: 'Asia/Tokyo' },
    { name: 'Australian Eastern Time (AET)', value: 'Australia/Sydney' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timezone')
        .setDescription('Set your timezone for Formula 1 events')
        .addStringOption(option =>
            option.setName('timezone')
                .setDescription('Your timezone')
                .setRequired(true)
                .addChoices(...COMMON_TIMEZONES))
        .addStringOption(option =>
            option.setName('custom')
                .setDescription('Custom timezone (e.g., Asia/Singapore)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                flags: 64
            });

            const timezone = interaction.options.getString('timezone');
            const customTimezone = interaction.options.getString('custom');
            
            // Use custom timezone if provided
            const finalTimezone = customTimezone || timezone;

            // Validate timezone
            try {
                const date = new Date();
                const formatter = new Intl.DateTimeFormat('en-US', { timeZone: finalTimezone });
                formatter.format(date);
            } catch (error) {
                return interaction.editReply({
                    embeds: [createErrorEmbed(
                        'Invalid timezone. Please use one of the common timezones or provide a valid IANA timezone name (e.g., America/New_York, Europe/London).\n\n' +
                        'You can find your timezone at: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones'
                    )],
                    flags: 64
                });
            }

            // Store timezone in database
            await db.setUserSetting(interaction.user.id, 'timezone', finalTimezone);

            // Get current time in user's timezone
            const now = new Date();
            const userTime = new Intl.DateTimeFormat('en-US', {
                timeZone: finalTimezone,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                timeZoneName: 'long'
            }).format(now);

            await interaction.editReply({
                embeds: [{
                    color: 0x00FF00,
                    title: '⏰ Timezone Updated',
                    description: `Your timezone has been set to: ${finalTimezone}`,
                    fields: [
                        {
                            name: 'Current Time',
                            value: userTime
                        }
                    ],
                    footer: {
                        text: 'Formula 1 Bot • All event times will now be shown in your timezone',
                        icon_url: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                    }
                }]
            });
        } catch (error) {
            console.error('Error in /timezone command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while setting your timezone. Please try again later.')],
                flags: 64
            });
        }
    },
}; 