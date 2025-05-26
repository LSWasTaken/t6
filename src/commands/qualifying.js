const { SlashCommandBuilder } = require('discord.js');
const { getQualifyingResults, APIError } = require('../utils/api');
const { createQualifyingEmbed, createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const { findMatchingGPs, createGPSelectionEmbed } = require('../utils/gpMatcher');
const { isValidYear } = require('../utils/validators');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qualifying')
        .setDescription('Shows qualifying results for a specified Grand Prix')
        .addIntegerOption(option =>
            option.setName('year')
                .setDescription('The year of the qualifying (e.g., 2023)')
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

            // If round is provided and not a number, check for ambiguous GP names
            if (round && isNaN(parseInt(round))) {
                const matches = findMatchingGPs(round);
                
                if (matches.length > 1) {
                    return interaction.editReply({
                        embeds: [createGPSelectionEmbed(matches)],
                        ephemeral: true
                    });
                }
            }

            // Get qualifying results
            const data = await getQualifyingResults(year, round);
            if (!data || !data.MRData?.RaceTable?.Races?.[0]) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('No qualifying data found for the specified year and round.')],
                    flags: 64
                });
            }

            // Create initial embed with first page
            const { embed, totalPages } = createQualifyingEmbed(data, 0);

            // Create message with buttons
            const message = await interaction.editReply({
                embeds: [embed],
                components: totalPages > 1 ? [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 1,
                                label: 'Previous',
                                custom_id: 'prev',
                                disabled: true
                            },
                            {
                                type: 2,
                                style: 1,
                                label: 'Next',
                                custom_id: 'next',
                                disabled: totalPages === 1
                            }
                        ]
                    }
                ] : []
            });

            // If there's only one page, no need for collector
            if (totalPages <= 1) return;

            // Create collector for button interactions
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000 // 5 minutes
            });

            let currentPage = 0;

            collector.on('collect', async (i) => {
                if (i.customId === 'next') {
                    currentPage++;
                } else if (i.customId === 'prev') {
                    currentPage--;
                }

                // Update embed with new page
                const { embed: newEmbed } = createQualifyingEmbed(data, currentPage);

                // Update buttons
                const components = [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 1,
                                label: 'Previous',
                                custom_id: 'prev',
                                disabled: currentPage === 0
                            },
                            {
                                type: 2,
                                style: 1,
                                label: 'Next',
                                custom_id: 'next',
                                disabled: currentPage === totalPages - 1
                            }
                        ]
                    }
                ];

                await i.update({ embeds: [newEmbed], components });
            });

            collector.on('end', () => {
                // Remove buttons when collector expires
                interaction.editReply({ components: [] }).catch(console.error);
            });
        } catch (error) {
            console.error('Error in /qualifying command:', error);
            
            let errorMessage;
            if (error instanceof APIError) {
                if (error.status === 0) {
                    errorMessage = 'Unable to connect to the Formula 1 API. Please try again later.';
                } else {
                    errorMessage = error.message;
                }
            } else {
                errorMessage = 'An error occurred while fetching qualifying results. Please try again later.';
            }
            
            await interaction.editReply({
                embeds: [createErrorEmbed(errorMessage)],
                flags: 64
            });
        }
    },
}; 