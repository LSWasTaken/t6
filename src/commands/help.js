const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Create paginated help embeds
const createHelpEmbeds = () => {
    return [
        {
            color: 0xFF1801,
            title: '🏎️ Formula 1 Bot Commands (1/4)',
            description: 'Here are the available commands:',
            fields: [
                {
                    name: '⏰ Timing & Schedule',
                    value: [
                        '`/when` - Shows time until next F1 session',
                        '• Displays all weekend sessions',
                        '• Practice, Qualifying, Sprint, and Race times',
                        '• Countdown to next session',
                        '• Local time conversion'
                    ].join('\n')
                },
                {
                    name: '📊 Live Session Data',
                    value: [
                        '`/live` - Real-time session data',
                        '• Current lap and flag status',
                        '• Tire compounds and gaps',
                        '• Driver positions and times',
                        '• Season schedule when no session is active'
                    ].join('\n')
                }
            ],
            footer: {
                text: 'Page 1/4 • Use the buttons below to navigate',
                iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
            }
        },
        {
            color: 0xFF1801,
            title: '🏎️ Formula 1 Bot Commands (2/4)',
            description: 'Here are the available commands:',
            fields: [
                {
                    name: '🏁 Race Information',
                    value: [
                        '`/race [year] [round]` - Race results',
                        '• Top 10 finishers with team and status',
                        '• Fastest lap information',
                        '• Race statistics and highlights',
                        '• Historical race data available'
                    ].join('\n')
                },
                {
                    name: '⏱️ Qualifying & Fastest Laps',
                    value: [
                        '`/qualifying [year] [round]` - Qualifying results',
                        '• Q1, Q2, and Q3 times',
                        '• Pole position and team info',
                        '`/fastestlap [year] [round]` - Fastest lap info',
                        '• Lap number, time, and speed',
                        '• Driver and team details'
                    ].join('\n')
                }
            ],
            footer: {
                text: 'Page 2/4 • Use the buttons below to navigate',
                iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
            }
        },
        {
            color: 0xFF1801,
            title: '🏎️ Formula 1 Bot Commands (3/4)',
            description: 'Here are the available commands:',
            fields: [
                {
                    name: '📈 Statistics & Information',
                    value: [
                        '`/standings (type) [year]` - Championship standings',
                        '• Drivers\' and Constructors\' standings',
                        '• Historical standings available',
                        '`/driver [query]` - Driver information',
                        '• Career statistics and achievements',
                        '• Current team and number',
                        '`/team [name]` - Team information',
                        '• Team history and achievements',
                        '• Current drivers and statistics',
                        '`/map` - 2024 season schedule',
                        '• Interactive track map',
                        '• Race dates and locations'
                    ].join('\n')
                }
            ],
            footer: {
                text: 'Page 3/4 • Use the buttons below to navigate',
                iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
            }
        },
        {
            color: 0xFF1801,
            title: '🏎️ Formula 1 Bot Commands (4/4)',
            description: 'Here are the available commands:',
            fields: [
                {
                    name: '⚙️ Settings & Notifications',
                    value: [
                        '`/timezone [timezone]` - Set your timezone',
                        '• Convert all times to your local time',
                        '• Supports all major timezones',
                        '`/settings` - View current settings',
                        '• Check your notification preferences',
                        '• View your timezone settings',
                        '`/eautoevent` - Enable auto Discord events',
                        '• Creates events for all sessions',
                        '• Automatic race notifications',
                        '`/motorsport [series]` - F1 news updates',
                        '• Latest news and updates',
                        '• Multiple series available',
                        '`/twitter` - F1 Twitter updates',
                        '• Official F1 Twitter feed',
                        '• Real-time updates and news'
                    ].join('\n')
                }
            ],
            footer: {
                text: 'Page 4/4 • Use the buttons below to navigate',
                iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
            }
        }
    ];
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows information about all available commands'),

    async execute(interaction) {
        try {
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
                );

            // Send initial embed with buttons
            const embeds = createHelpEmbeds();
            const message = await interaction.reply({
                embeds: [embeds[0]],
                components: [buttons],
                ephemeral: true
            });

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
            console.error('Error in /help command:', error);
            await interaction.reply({
                content: 'An error occurred while fetching the help information. Please try again later.',
                ephemeral: true
            });
        }
    },
}; 