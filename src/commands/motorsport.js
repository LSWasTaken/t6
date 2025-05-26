const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const db = require('../utils/database');

// API endpoints and keys
const SPORTS_DB_API = 'https://www.thesportsdb.com/api/v1/json/3';
const NEWS_API_KEY = '3123a1d3157c4c42bf3fc6b507866926';

// Series configurations
const SERIES_CONFIG = {
    f1: {
        name: 'Formula 1',
        teamsEndpoint: `${SPORTS_DB_API}/search_all_teams.php?l=Formula+1`,
        newsQuery: 'Formula 1 racing'
    },
    f2: {
        name: 'Formula 2',
        teamsEndpoint: `${SPORTS_DB_API}/search_all_teams.php?l=Formula+2`,
        newsQuery: 'Formula 2 racing'
    },
    f3: {
        name: 'Formula 3',
        teamsEndpoint: `${SPORTS_DB_API}/search_all_teams.php?l=Formula+3`,
        newsQuery: 'Formula 3 racing'
    },
    fe: {
        name: 'Formula E',
        teamsEndpoint: `${SPORTS_DB_API}/search_all_teams.php?l=Formula+E`,
        newsQuery: 'Formula E racing'
    },
    indycar: {
        name: 'IndyCar Series',
        teamsEndpoint: `${SPORTS_DB_API}/search_all_teams.php?l=Indycar+Series`,
        newsQuery: 'IndyCar racing'
    },
    wec: {
        name: 'World Endurance Championship',
        teamsEndpoint: `${SPORTS_DB_API}/search_all_teams.php?l=World+Endurance+Championship`,
        newsQuery: 'WEC racing'
    }
};

// Fetch teams for a series
async function fetchTeams(series) {
    const config = SERIES_CONFIG[series];
    const response = await fetch(config.teamsEndpoint);
    const data = await response.json();
    return data.teams || [];
}

// Fetch news for a series
async function fetchNews(series) {
    const config = SERIES_CONFIG[series];
    const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(config.newsQuery)}&apiKey=${NEWS_API_KEY}&language=en&sortBy=publishedAt&pageSize=3`);
    const data = await response.json();
    return data.articles || [];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('motorsport')
        .setDescription('Enable Motorsport.com notifications for various motorsport series')
        .addStringOption(option =>
            option.setName('series')
                .setDescription('The motorsport series to enable notifications for')
                .setRequired(true)
                .addChoices(
                    { name: 'Formula 1', value: 'f1' },
                    { name: 'Formula 2', value: 'f2' },
                    { name: 'Formula 3', value: 'f3' },
                    { name: 'Formula E', value: 'fe' },
                    { name: 'IndyCar', value: 'indycar' },
                    { name: 'WEC', value: 'wec' }
                )),

    async execute(interaction) {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({
                    embeds: [createErrorEmbed('You need Administrator permissions to use this command.')],
                    ephemeral: true
                });
            }

            await interaction.reply({
                embeds: [createLoadingEmbed()],
                ephemeral: true
            });

            const series = interaction.options.getString('series');
            const config = SERIES_CONFIG[series];

            // Fetch teams and news
            const [teams, news] = await Promise.all([
                fetchTeams(series),
                fetchNews(series)
            ]);

            // Create main embed
            const mainEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`📰 ${config.name} Information`)
                .setDescription(`Notifications for ${config.name} have been enabled in this channel.`)
                .addFields(
                    {
                        name: '🏎️ Teams',
                        value: teams.length > 0 
                            ? teams.map(team => `• ${team.strTeam}`).join('\n')
                            : 'No team information available'
                    },
                    {
                        name: '📰 Latest News',
                        value: news.length > 0
                            ? news.map(article => `• [${article.title}](${article.url})`).join('\n')
                            : 'No recent news available'
                    }
                )
                .setFooter({ 
                    text: 'Formula 1 Bot',
                    iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                });

            // Store notification setting in database
            await db.setChannelSetting(interaction.channelId, 'motorsportNotifications', {
                enabled: true,
                series: series,
                lastUpdated: new Date().toISOString()
            });

            await interaction.editReply({
                embeds: [mainEmbed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in /motorsport command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while enabling notifications. Please try again later.')],
                ephemeral: true
            });
        }
    },
}; 