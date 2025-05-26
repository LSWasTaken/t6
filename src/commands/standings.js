const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getDriverStandings, getConstructorStandings, APIError } = require('../utils/api');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const { isValidYear } = require('../utils/validators');

// Create paginated standings embeds
const createStandingsEmbeds = (standingsData, type, year) => {
    const standings = type === 'drivers' 
        ? standingsData.DriverStandings 
        : standingsData.ConstructorStandings;

    const embeds = [];
    const itemsPerPage = 10;
    const totalPages = Math.ceil(standings.length / itemsPerPage);

    for (let i = 0; i < totalPages; i++) {
        const start = i * itemsPerPage;
        const end = start + itemsPerPage;
        const pageStandings = standings.slice(start, end);

        const standingsText = pageStandings.map((standing, index) => {
            if (type === 'drivers') {
                const driver = standing.Driver;
                const constructor = standing.Constructors[0];
                const points = standing.points;
                const wins = standing.wins;
                const position = start + index + 1;
                
                // Format position with padding
                const posStr = position.toString().padStart(2, ' ');
                
                // Format points with padding
                const pointsStr = points.toString().padStart(3, ' ');
                
                // Format wins with padding
                const winsStr = wins.toString().padStart(2, ' ');
                
                return `${posStr}. [${driver.code}] ${driver.givenName} ${driver.familyName} (${constructor.name}) - ${pointsStr} pts${wins > 0 ? ` (${winsStr} wins)` : ''}`;
            } else {
                const constructor = standing.Constructor;
                const points = standing.points;
                const wins = standing.wins;
                const position = start + index + 1;
                
                // Format position with padding
                const posStr = position.toString().padStart(2, ' ');
                
                // Format points with padding
                const pointsStr = points.toString().padStart(3, ' ');
                
                // Format wins with padding
                const winsStr = wins.toString().padStart(2, ' ');
                
                return `${posStr}. ${constructor.name} - ${pointsStr} pts${wins > 0 ? ` (${winsStr} wins)` : ''}`;
            }
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0xFF1801)
            .setTitle(`${year} Formula 1 ${type === 'drivers' ? 'Driver' : 'Constructor'} Standings`)
            .setDescription(`\`\`\`\n${standingsText}\n\`\`\``)
            .setFooter({ 
                text: `Page ${i + 1}/${totalPages} • Formula 1 Bot`,
                iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
            });

        embeds.push(embed);
    }

    return embeds;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('standings')
        .setDescription('Get Formula 1 standings')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of standings to show')
                .setRequired(true)
                .addChoices(
                    { name: 'Drivers', value: 'drivers' },
                    { name: 'Constructors', value: 'constructors' }
                ))
        .addIntegerOption(option =>
            option.setName('year')
                .setDescription('The year to get standings for (e.g., 2023)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                ephemeral: true
            });

            const type = interaction.options.getString('type');
            const year = interaction.options.getInteger('year') || new Date().getFullYear();

            // Validate year
            if (!isValidYear(year)) {
                return interaction.editReply({
                    embeds: [createErrorEmbed(`Invalid year. Please provide a year between 1950 and ${new Date().getFullYear() + 1}.`)],
                    ephemeral: true
                });
            }

            // Get standings data
            const data = type === 'drivers' 
                ? await getDriverStandings(year)
                : await getConstructorStandings(year);

            if (!data || !data.MRData?.StandingsTable?.StandingsLists?.[0]) {
                return interaction.editReply({
                    embeds: [createErrorEmbed(`No standings data found for ${year}.`)],
                    ephemeral: true
                });
            }

            const standings = data.MRData.StandingsTable.StandingsLists[0];
            const embeds = createStandingsEmbeds(standings, type, year);

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
            console.error('Error in /standings command:', error);
            
            let errorMessage;
            if (error instanceof APIError) {
                if (error.status === 0) {
                    errorMessage = 'Unable to connect to the Formula 1 API. Please try again later.';
                } else {
                    errorMessage = error.message;
                }
            } else {
                errorMessage = 'An error occurred while fetching standings data. Please try again later.';
            }
            
            await interaction.editReply({
                embeds: [createErrorEmbed(errorMessage)],
                ephemeral: true
            });
        }
    },
}; 