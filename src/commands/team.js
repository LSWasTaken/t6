const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');

// Team configurations with additional data
const TEAM_CONFIG = {
    'red_bull': {
        fullName: 'Oracle Red Bull Racing',
        base: 'Milton Keynes, United Kingdom',
        teamPrincipal: 'Christian Horner',
        color: 0x0600EF,
        championships: 6,
        firstSeason: 2005
    },
    'mercedes': {
        fullName: 'Mercedes-AMG Petronas F1 Team',
        base: 'Brackley, United Kingdom',
        teamPrincipal: 'Toto Wolff',
        color: 0x00D2BE,
        championships: 8,
        firstSeason: 2010
    },
    'ferrari': {
        fullName: 'Scuderia Ferrari',
        base: 'Maranello, Italy',
        teamPrincipal: 'Frédéric Vasseur',
        color: 0xDC0000,
        championships: 16,
        firstSeason: 1950
    },
    'mclaren': {
        fullName: 'McLaren F1 Team',
        base: 'Woking, United Kingdom',
        teamPrincipal: 'Andrea Stella',
        color: 0xFF8700,
        championships: 8,
        firstSeason: 1966
    },
    'alpine': {
        fullName: 'BWT Alpine F1 Team',
        base: 'Enstone, United Kingdom',
        teamPrincipal: 'Bruno Famin',
        color: 0x0090FF,
        championships: 0,
        firstSeason: 1977
    },
    'aston_martin': {
        fullName: 'Aston Martin Aramco F1 Team',
        base: 'Silverstone, United Kingdom',
        teamPrincipal: 'Mike Krack',
        color: 0x006F62,
        championships: 0,
        firstSeason: 2018
    },
    'rb': {
        fullName: 'Visa Cash App RB F1 Team',
        base: 'Faenza, Italy',
        teamPrincipal: 'Laurent Mekies',
        color: 0x1E41FF,
        championships: 0,
        firstSeason: 2006
    },
    'williams': {
        fullName: 'Williams Racing',
        base: 'Grove, United Kingdom',
        teamPrincipal: 'James Vowles',
        color: 0x005AFF,
        championships: 9,
        firstSeason: 1977
    },
    'haas': {
        fullName: 'MoneyGram Haas F1 Team',
        base: 'Kannapolis, United States',
        teamPrincipal: 'Ayao Komatsu',
        color: 0xFFFFFF,
        championships: 0,
        firstSeason: 2016
    },
    'sauber': {
        fullName: 'Stake F1 Team Kick Sauber',
        base: 'Hinwil, Switzerland',
        teamPrincipal: 'Alessandro Alunni Bravi',
        color: 0x900000,
        championships: 0,
        firstSeason: 1993
    }
};

// Fetch team drivers from Ergast API
async function fetchTeamDrivers(constructorId) {
    try {
        const response = await fetch(`https://api.jolpi.ca/ergast/f1/2025/constructors/${constructorId}/drivers.json`);
        const data = await response.json();
        return data.MRData?.DriverTable?.Drivers || [];
    } catch (error) {
        console.error('Error fetching team drivers:', error);
        return [];
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('team')
        .setDescription('Get information about a Formula 1 team')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Team name (e.g., Red Bull, Mercedes, Ferrari)')
                .setRequired(true)
                .addChoices(
                    { name: 'Red Bull', value: 'red_bull' },
                    { name: 'Mercedes', value: 'mercedes' },
                    { name: 'Ferrari', value: 'ferrari' },
                    { name: 'McLaren', value: 'mclaren' },
                    { name: 'Alpine', value: 'alpine' },
                    { name: 'Aston Martin', value: 'aston_martin' },
                    { name: 'RB', value: 'rb' },
                    { name: 'Williams', value: 'williams' },
                    { name: 'Haas', value: 'haas' },
                    { name: 'Sauber', value: 'sauber' }
                )),

    async execute(interaction) {
        try {
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                ephemeral: true
            });

            const teamId = interaction.options.getString('name');
            const teamConfig = TEAM_CONFIG[teamId];

            if (!teamConfig) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Team not found. Please check the team name and try again.')],
                    ephemeral: true
                });
            }

            // Fetch current drivers
            const drivers = await fetchTeamDrivers(teamId);
            const driverNames = drivers.map(driver => `${driver.givenName} ${driver.familyName}`);

            const embed = new EmbedBuilder()
                .setColor(teamConfig.color)
                .setTitle(teamConfig.fullName)
                .setDescription(`**Base:** ${teamConfig.base}\n**Team Principal:** ${teamConfig.teamPrincipal}`)
                .addFields(
                    {
                        name: '🏎️ Current Drivers',
                        value: driverNames.length > 0 ? driverNames.join('\n') : 'No drivers assigned',
                        inline: true
                    },
                    {
                        name: '🏆 Championships',
                        value: teamConfig.championships.toString(),
                        inline: true
                    },
                    {
                        name: '📅 First Season',
                        value: teamConfig.firstSeason.toString(),
                        inline: true
                    }
                )
                .setFooter({ 
                    text: 'Formula 1 Bot',
                    iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                });

            await interaction.editReply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in /team command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while fetching team information. Please try again later.')],
                ephemeral: true
            });
        }
    },
}; 