const { SlashCommandBuilder } = require('discord.js');
const { getLiveSession, getCurrentSchedule } = require('../utils/api');
const { createLiveSessionEmbed, createScheduleEmbed, createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('live')
        .setDescription('Shows live Formula 1 session information'),

    async execute(interaction) {
        try {
            // Send initial loading message
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                flags: 64
            });

            // Get live session data
            const data = await getLiveSession();

            if (!data) {
                // If no live session, show current season schedule
                const scheduleData = await getCurrentSchedule();
                if (!scheduleData) {
                    return interaction.editReply({
                        embeds: [createErrorEmbed('Unable to fetch Formula 1 data. Please try again later.')],
                        flags: 64
                    });
                }

                const scheduleEmbed = createScheduleEmbed(scheduleData);
                return interaction.editReply({
                    embeds: [
                        createErrorEmbed('No active Formula 1 session at the moment.'),
                        scheduleEmbed
                    ]
                });
            }

            // Create and send the live session embed
            const embed = createLiveSessionEmbed(data);
            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error('Error in /live command:', error);
            
            // Try to show schedule as fallback
            try {
                const scheduleData = await getCurrentSchedule();
                if (scheduleData) {
                    const scheduleEmbed = createScheduleEmbed(scheduleData);
                    return interaction.editReply({
                        embeds: [
                            createErrorEmbed('Unable to fetch live session data. Showing current season schedule instead.'),
                            scheduleEmbed
                        ]
                    });
                }
            } catch (scheduleError) {
                console.error('Error fetching schedule:', scheduleError);
            }

            // If all else fails, show generic error
            await interaction.editReply({
                embeds: [createErrorEmbed('Unable to fetch Formula 1 data. Please try again later.')],
                flags: 64
            });
        }
    },
}; 