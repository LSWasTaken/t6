const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Group circuits by region
const groupCircuitsByRegion = (circuits) => {
    const regions = {
        'Europe': [],
        'Americas': [],
        'Asia & Middle East': [],
        'Oceania': [],
        'Africa': []
    };

    circuits.forEach(circuit => {
        const country = circuit.Location.country;
        if (['UK', 'Spain', 'France', 'Germany', 'Italy', 'Switzerland', 'Portugal', 'Hungary', 'Turkey'].includes(country)) {
            regions['Europe'].push(circuit);
        } else if (['USA', 'Brazil', 'Argentina', 'Canada', 'Mexico'].includes(country)) {
            regions['Americas'].push(circuit);
        } else if (['Japan', 'China', 'UAE', 'Bahrain', 'Azerbaijan', 'India'].includes(country)) {
            regions['Asia & Middle East'].push(circuit);
        } else if (['Australia'].includes(country)) {
            regions['Oceania'].push(circuit);
        } else if (['South Africa', 'Morocco'].includes(country)) {
            regions['Africa'].push(circuit);
        }
    });

    return regions;
};

// Split circuits into chunks to fit Discord's field value limit
const splitCircuitsIntoChunks = (circuits, chunkSize = 4) => {
    const chunks = [];
    for (let i = 0; i < circuits.length; i += chunkSize) {
        chunks.push(circuits.slice(i, i + chunkSize));
    }
    return chunks;
};

// Create embed for part 1 (Europe and Americas)
const createPart1Embed = (regions) => {
    const embed = new EmbedBuilder()
        .setColor('#FF1801')
        .setTitle('🏎️ Formula 1 Circuits (Part 1/2)')
        .setDescription('Here are the Formula 1 circuits in Europe and the Americas:');

    // Add Europe circuits in chunks
    const europeChunks = splitCircuitsIntoChunks(regions['Europe']);
    europeChunks.forEach((chunk, index) => {
        embed.addFields({
            name: index === 0 ? '🌍 Europe' : 'Europe (continued)',
            value: chunk.map(circuit => 
                `• [${circuit.circuitName}](${circuit.url}) - ${circuit.Location.locality}, ${circuit.Location.country}`
            ).join('\n')
        });
    });

    // Add Americas circuits in chunks
    const americasChunks = splitCircuitsIntoChunks(regions['Americas']);
    americasChunks.forEach((chunk, index) => {
        embed.addFields({
            name: index === 0 ? '🌎 Americas' : 'Americas (continued)',
            value: chunk.map(circuit => 
                `• [${circuit.circuitName}](${circuit.url}) - ${circuit.Location.locality}, ${circuit.Location.country}`
            ).join('\n')
        });
    });

    embed.setFooter({ 
        text: 'Click on circuit names to view more information on Wikipedia',
        iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
    });

    return embed;
};

// Create embed for part 2 (Asia, Oceania, and Africa)
const createPart2Embed = (regions) => {
    const embed = new EmbedBuilder()
        .setColor('#FF1801')
        .setTitle('🏎️ Formula 1 Circuits (Part 2/2)')
        .setDescription('Here are the Formula 1 circuits in Asia, Oceania, and Africa:');

    // Add Asia & Middle East circuits in chunks
    const asiaChunks = splitCircuitsIntoChunks(regions['Asia & Middle East']);
    asiaChunks.forEach((chunk, index) => {
        embed.addFields({
            name: index === 0 ? '🌏 Asia & Middle East' : 'Asia & Middle East (continued)',
            value: chunk.map(circuit => 
                `• [${circuit.circuitName}](${circuit.url}) - ${circuit.Location.locality}, ${circuit.Location.country}`
            ).join('\n')
        });
    });

    // Add Oceania circuits
    if (regions['Oceania'].length > 0) {
        embed.addFields({
            name: '🌏 Oceania',
            value: regions['Oceania'].map(circuit => 
                `• [${circuit.circuitName}](${circuit.url}) - ${circuit.Location.locality}, ${circuit.Location.country}`
            ).join('\n')
        });
    }

    // Add Africa circuits
    if (regions['Africa'].length > 0) {
        embed.addFields({
            name: '🌍 Africa',
            value: regions['Africa'].map(circuit => 
                `• [${circuit.circuitName}](${circuit.url}) - ${circuit.Location.locality}, ${circuit.Location.country}`
            ).join('\n')
        });
    }

    embed.setFooter({ 
        text: 'Click on circuit names to view more information on Wikipedia',
        iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
    });

    return embed;
};

// Create navigation buttons
const createNavigationButtons = (currentPart) => {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('part1')
                .setLabel('Part 1')
                .setStyle(currentPart === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(currentPart === 1),
            new ButtonBuilder()
                .setCustomId('part2')
                .setLabel('Part 2')
                .setStyle(currentPart === 2 ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(currentPart === 2)
        );
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('map')
        .setDescription('Shows all Formula 1 circuits and their locations'),

    async execute(interaction) {
        try {
            // Create loading embed
            const loadingEmbed = new EmbedBuilder()
                .setColor('#FF1801')
                .setTitle('Loading Circuits...')
                .setDescription('Please wait while I fetch the circuit information...')
                .setFooter({ 
                    text: 'Formula 1 Bot',
                    iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                });

            await interaction.reply({
                embeds: [loadingEmbed],
                ephemeral: true
            });

            // Fetch circuits data
            const response = await fetch('https://api.jolpi.ca/ergast/f1/circuits/?format=json');
            if (!response.ok) {
                throw new Error('Failed to fetch circuit data');
            }

            const data = await response.json();
            if (!data?.MRData?.CircuitTable?.Circuits) {
                throw new Error('Invalid circuit data received');
            }

            const regions = groupCircuitsByRegion(data.MRData.CircuitTable.Circuits);

            // Send initial message with part 1
            const message = await interaction.editReply({
                embeds: [createPart1Embed(regions)],
                components: [createNavigationButtons(1)],
                ephemeral: true
            });

            // Create button collector
            const collector = message.createMessageComponentCollector({
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({
                        content: 'You cannot use these buttons.',
                        ephemeral: true
                    });
                    return;
                }

                const part = i.customId === 'part1' ? 1 : 2;
                await i.update({
                    embeds: [part === 1 ? createPart1Embed(regions) : createPart2Embed(regions)],
                    components: [createNavigationButtons(part)]
                });
            });

            collector.on('end', () => {
                interaction.editReply({
                    components: []
                }).catch(console.error);
            });

        } catch (error) {
            console.error('Error in /map command:', error);
            await interaction.editReply({
                content: 'An error occurred while fetching circuit information. Please try again later.',
                ephemeral: true
            });
        }
    },
}; 