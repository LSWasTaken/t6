const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('View current Formula 1 bot settings'),

    async execute(interaction) {
        try {
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                flags: 64
            });

            // Get user settings
            const timezone = await db.getUserSetting(interaction.user.id, 'timezone') || 'Not set';
            
            // Get channel settings
            const weeklyAlerts = await db.getChannelSetting(interaction.channelId, 'weeklyAlerts');
            const autoEvents = await db.getChannelSetting(interaction.channelId, 'autoEvents');
            const sessionNotifications = await db.getChannelSetting(interaction.channelId, 'sessionNotifications');
            const motorsportNotifications = await db.getChannelSetting(interaction.channelId, 'motorsportNotifications');
            const twitterNotifications = await db.getChannelSetting(interaction.channelId, 'twitterNotifications');
            const raceweekNotifications = await db.getChannelSetting(interaction.channelId, 'raceweekNotifications');

            // Create main settings embed
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('⚙️ Formula 1 Bot Settings')
                .setDescription('Current settings for this server:')
                .addFields(
                    {
                        name: '👤 User Settings',
                        value: `⏰ **Timezone:** ${timezone}`,
                        inline: false
                    },
                    {
                        name: '📢 Notifications',
                        value: [
                            `📅 **Weekly Alerts:** ${weeklyAlerts ? '✅ Enabled' : '❌ Disabled'}`,
                            `📅 **Auto Events:** ${autoEvents ? '✅ Enabled' : '❌ Disabled'}`,
                            `🏎️ **Session Notifications:** ${sessionNotifications ? '✅ Enabled' : '❌ Disabled'}`,
                            `📰 **Motorsport.com:** ${motorsportNotifications ? '✅ Enabled' : '❌ Disabled'}`,
                            `🐦 **Twitter @F1:** ${twitterNotifications ? '✅ Enabled' : '❌ Disabled'}`,
                            `📅 **Race Week:** ${raceweekNotifications ? '✅ Enabled' : '❌ Disabled'}`
                        ].join('\n'),
                        inline: false
                    }
                )
                .setFooter({ 
                    text: 'Use /help to see how to change these settings',
                    iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                });

            // Add notification details if any are enabled
            if (sessionNotifications) {
                const sessionType = sessionNotifications.type;
                embed.addFields({
                    name: '🏎️ Session Details',
                    value: `Notifications enabled for: ${sessionType === 'all' ? 'All sessions' : sessionType.charAt(0).toUpperCase() + sessionType.slice(1)}`,
                    inline: false
                });
            }

            if (motorsportNotifications) {
                const series = motorsportNotifications.series;
                embed.addFields({
                    name: '📰 Motorsport.com Details',
                    value: `Notifications enabled for: ${series.toUpperCase()}`,
                    inline: false
                });
            }

            await interaction.editReply({
                embeds: [embed],
                flags: 64
            });
        } catch (error) {
            console.error('Error in /settings command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while fetching settings. Please try again later.')],
                flags: 64
            });
        }
    },
}; 