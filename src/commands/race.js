const { SlashCommandBuilder } = require('discord.js');
const { getRaceResults, APIError } = require('../utils/api');
const { createRaceResultsEmbed, createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const { isValidYear } = require('../utils/validators');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('race')
        .setDescription('Shows race results for a specified Grand Prix')
        .addIntegerOption(option =>
            option.setName('year')
                .setDescription('The year of the race (e.g., 2023)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('round')
                .setDescription('The round number (1-24)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Send initial loading message
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                flags: 64
            });

            // Get command options
            const year = interaction.options.getInteger('year');
            const round = interaction.options.getInteger('round');

            // Validate year
            if (!isValidYear(year)) {
                return interaction.editReply({
                    embeds: [createErrorEmbed(`Invalid year. Please provide a year between 1950 and ${new Date().getFullYear() + 1}.`)],
                    flags: 64
                });
            }

            // Get race results
            const data = await getRaceResults(year, round);
            if (!data || !data.MRData?.RaceTable?.Races?.[0]) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('No race data found for the specified year and round.')],
                    flags: 64
                });
            }

            // Create and send the race results embed
            const embed = createRaceResultsEmbed(data);
            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error('Error in /race command:', error);
            
            let errorMessage;
            if (error instanceof APIError) {
                if (error.status === 0) {
                    errorMessage = 'Unable to connect to the Formula 1 API. Please try again later.';
                } else {
                    errorMessage = error.message;
                }
            } else {
                errorMessage = 'An error occurred while fetching race results. Please try again later.';
            }
            
            await interaction.editReply({
                embeds: [createErrorEmbed(errorMessage)],
                flags: 64
            });
        }
    },
}; 