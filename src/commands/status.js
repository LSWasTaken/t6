const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDriverStatus, APIError } = require('../utils/api');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const { isValidYear } = require('../utils/validators');

// Create paginated status embeds
const createStatusEmbeds = (statusData, year, round, driver) => {
    const statuses = statusData.MRData.StatusTable.Status;
    const embeds = [];
    const itemsPerPage = 10;
    const totalPages = Math.ceil(statuses.length / itemsPerPage);

    for (let i = 0; i < totalPages; i++) {
        const start = i * itemsPerPage;
        const end = start + itemsPerPage;
        const pageStatuses = statuses.slice(start, end);

        const statusText = pageStatuses.map((status, index) => {
            const count = parseInt(status.count);
            return `${start + index + 1}. ${status.status} - ${count} occurrence${count !== 1 ? 's' : ''}`;
        }).join('\n');

        let title = `${year} Formula 1 Driver Status Statistics`;
        if (round) title += ` - Round ${round}`;
        if (driver) title += ` - ${driver}`;

        embeds.push({
            color: 0xFF1801,
            title: title,
            description: statusText,
            footer: {
                text: `Page ${i + 1}/${totalPages} • Formula 1 Bot`,
                iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
            }
        });
    }

    return embeds;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Get Formula 1 driver status statistics')
        .addIntegerOption(option =>
            option.setName('year')
                .setDescription('The year to get status for (e.g., 2023)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('round')
                .setDescription('The round number (1-24)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('driver')
                .setDescription('The driver to get status for')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                ephemeral: true
            });

            const year = interaction.options.getInteger('year') || new Date().getFullYear();
            const round = interaction.options.getInteger('round');
            const driver = interaction.options.getString('driver');

            // Validate year
            if (!isValidYear(year)) {
                return interaction.editReply({
                    embeds: [createErrorEmbed(`Invalid year. Please provide a year between 1950 and ${new Date().getFullYear() + 1}.`)],
                    ephemeral: true
                });
            }

            // Validate round if provided
            if (round && (round < 1 || round > 24)) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Invalid round number. Please provide a round between 1 and 24.')],
                    ephemeral: true
                });
            }

            // Get status data
            const data = await getDriverStatus(year, round, driver);

            if (!data || !data.MRData?.StatusTable?.Status) {
                return interaction.editReply({
                    embeds: [createErrorEmbed(`No status data found for ${year}${round ? ` round ${round}` : ''}${driver ? ` driver ${driver}` : ''}.`)],
                    ephemeral: true
                });
            }

            const embeds = createStatusEmbeds(data, year, round, driver);

            // Create buttons for pagination
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(embeds.length === 1)
                );

            // Send initial embed with buttons
            const message = await interaction.editReply({
                embeds: [embeds[0]],
                components: embeds.length > 1 ? [buttons] : [],
                ephemeral: true
            });

            // If only one page, no need for collector
            if (embeds.length <= 1) return;

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

                // Update buttons
                const newButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === embeds.length - 1)
                    );

                await i.update({
                    embeds: [embeds[currentPage]],
                    components: [newButtons]
                });
            });

            collector.on('end', () => {
                // Remove buttons when collector expires
                interaction.editReply({ components: [] }).catch(console.error);
            });
        } catch (error) {
            console.error('Error in /status command:', error);
            
            let errorMessage;
            if (error instanceof APIError) {
                if (error.status === 0) {
                    errorMessage = 'Unable to connect to the Formula 1 API. Please try again later.';
                } else {
                    errorMessage = error.message;
                }
            } else {
                errorMessage = 'An error occurred while fetching status data. Please try again later.';
            }
            
            await interaction.editReply({
                embeds: [createErrorEmbed(errorMessage)],
                ephemeral: true
            });
        }
    },
}; 