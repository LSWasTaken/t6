const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');

// Convert time string to milliseconds for comparison
const timeToMs = (timeStr) => {
    const [minutes, seconds] = timeStr.split(':');
    return (parseInt(minutes) * 60 + parseFloat(seconds)) * 1000;
};

// Find fastest lap from all laps
const findFastestLap = (laps) => {
    let fastestLap = null;
    let fastestTime = Infinity;

    laps.forEach(lap => {
        lap.Timings.forEach(timing => {
            const timeMs = timeToMs(timing.time);
            if (timeMs < fastestTime) {
                fastestTime = timeMs;
                fastestLap = {
                    driverId: timing.driverId,
                    position: timing.position,
                    time: timing.time,
                    lapNumber: lap.number
                };
            }
        });
    });

    return fastestLap;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fastestlap')
        .setDescription('Shows the fastest lap from a specified Grand Prix')
        .addIntegerOption(option =>
            option.setName('year')
                .setDescription('The year of the race (e.g., 2025)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('round')
                .setDescription('The round number (1-24)')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                ephemeral: true
            });

            const year = interaction.options.getInteger('year');
            const round = interaction.options.getInteger('round');

            // Validate year
            if (year < 1950 || year > new Date().getFullYear() + 1) {
                return interaction.editReply({
                    embeds: [createErrorEmbed(`Invalid year. Please provide a year between 1950 and ${new Date().getFullYear() + 1}.`)],
                    ephemeral: true
                });
            }

            // Validate round
            if (round < 1 || round > 24) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Please provide a valid round number between 1 and 24.')],
                    ephemeral: true
                });
            }

            // Fetch lap data
            const response = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/laps/?format=json`);
            if (!response.ok) {
                throw new Error('Failed to fetch lap data');
            }

            const data = await response.json();
            if (!data?.MRData?.RaceTable?.Races?.[0]?.Laps) {
                return interaction.editReply({
                    embeds: [createErrorEmbed(`No lap data found for ${year} Round ${round}.`)],
                    ephemeral: true
                });
            }

            const race = data.MRData.RaceTable.Races[0];
            const fastestLap = findFastestLap(race.Laps);

            if (!fastestLap) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('No valid lap times found for this race.')],
                    ephemeral: true
                });
            }

            // Format driver name
            const formatDriverName = (driverId) => {
                return driverId.split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            };

            await interaction.editReply({
                embeds: [{
                    color: 0xFF1801,
                    title: `🏎️ Fastest Lap - ${race.raceName}`,
                    description: [
                        `**Circuit:** ${race.Circuit.circuitName}`,
                        `**Location:** ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`,
                        `**Date:** ${new Date(race.date).toLocaleDateString()}`,
                        '',
                        `**Fastest Lap Details**`,
                        `• Driver: ${formatDriverName(fastestLap.driverId)}`,
                        `• Lap Time: ${fastestLap.time}`,
                        `• Lap Number: ${fastestLap.lapNumber}`,
                        `• Position: ${fastestLap.position}`
                    ].join('\n'),
                    footer: {
                        text: 'Formula 1 Bot',
                        iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                    }
                }],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in /fastestlap command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while fetching fastest lap data. Please try again later.')],
                ephemeral: true
            });
        }
    },
}; 