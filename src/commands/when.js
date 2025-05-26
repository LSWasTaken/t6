const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const axios = require('axios');

// Format date and time for display
function formatDateTime(dateStr, timeStr) {
    const date = new Date(dateStr + 'T' + timeStr);
    return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

// Format time difference with seconds
function formatTimeDifference(ms) {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

    return parts.join(', ');
}

// Get session emoji
function getSessionEmoji(sessionType) {
    const emojis = {
        'FirstPractice': '🔄',
        'SecondPractice': '🔄',
        'ThirdPractice': '🔄',
        'SprintQualifying': '⚡',
        'Sprint': '🏃',
        'Qualifying': '⏱️',
        'Race': '🏁'
    };
    return emojis[sessionType] || '📅';
}

// Get session name with emoji
function getSessionName(type) {
    const names = {
        'FirstPractice': 'First Practice',
        'SecondPractice': 'Second Practice',
        'ThirdPractice': 'Third Practice',
        'SprintQualifying': 'Sprint Shootout',
        'Sprint': 'Sprint',
        'Qualifying': 'Qualifying',
        'Race': 'Race'
    };
    return `${getSessionEmoji(type)} ${names[type] || type}`;
}

// Get next session
function getNextSession(race) {
    const now = new Date();
    const sessions = [
        { type: 'FirstPractice', date: race.FirstPractice?.date, time: race.FirstPractice?.time },
        { type: 'SecondPractice', date: race.SecondPractice?.date, time: race.SecondPractice?.time },
        { type: 'ThirdPractice', date: race.ThirdPractice?.date, time: race.ThirdPractice?.time },
        { type: 'SprintQualifying', date: race.SprintQualifying?.date, time: race.SprintQualifying?.time },
        { type: 'Sprint', date: race.Sprint?.date, time: race.Sprint?.time },
        { type: 'Qualifying', date: race.Qualifying?.date, time: race.Qualifying?.time },
        { type: 'Race', date: race.date, time: race.time }
    ];

    for (const session of sessions) {
        if (session.date && session.time) {
            const sessionDate = new Date(session.date + 'T' + session.time);
            if (sessionDate > now) {
                return {
                    type: session.type,
                    date: sessionDate,
                    timeUntil: sessionDate - now
                };
            }
        }
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('when')
        .setDescription('Get the Formula 1 schedule with session status'),

    async execute(interaction) {
        try {
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                ephemeral: true
            });

            // Fetch current session data from Ergast API with retry logic
            let response;
            let retries = 3;
            
            while (retries > 0) {
                try {
                    response = await axios.get('https://api.jolpi.ca/ergast/f1/2025/?format=json', {
                        timeout: 5000 // 5 second timeout
                    });
                    break;
                } catch (error) {
                    retries--;
                    if (retries === 0) throw error;
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                }
            }

            if (!response?.data?.MRData?.RaceTable?.Races) {
                console.error('Invalid API response:', response?.data);
                return interaction.editReply({
                    embeds: [createErrorEmbed('Unable to fetch Formula 1 schedule. The API returned no data.')],
                    ephemeral: true
                });
            }

            const races = response.data.MRData.RaceTable.Races;
            if (races.length === 0) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('No races found in the schedule.')],
                    ephemeral: true
                });
            }

            // Find the next upcoming session
            let nextSession = null;
            let nextRace = null;

            for (const race of races) {
                const session = getNextSession(race);
                if (session && (!nextSession || session.date < nextSession.date)) {
                    nextSession = session;
                    nextRace = race;
                }
            }

            if (!nextSession) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('No upcoming sessions found in the schedule.')],
                    ephemeral: true
                });
            }

            const now = new Date();
            const sessions = [
                { type: 'FirstPractice', date: nextRace.FirstPractice?.date, time: nextRace.FirstPractice?.time },
                { type: 'SecondPractice', date: nextRace.SecondPractice?.date, time: nextRace.SecondPractice?.time },
                { type: 'ThirdPractice', date: nextRace.ThirdPractice?.date, time: nextRace.ThirdPractice?.time },
                { type: 'SprintQualifying', date: nextRace.SprintQualifying?.date, time: nextRace.SprintQualifying?.time },
                { type: 'Sprint', date: nextRace.Sprint?.date, time: nextRace.Sprint?.time },
                { type: 'Qualifying', date: nextRace.Qualifying?.date, time: nextRace.Qualifying?.time },
                { type: 'Race', date: nextRace.date, time: nextRace.time }
            ]
                .filter(session => session.date && session.time)
                .map(session => {
                    const sessionDate = new Date(session.date + 'T' + session.time);
                    const isNext = session.type === nextSession.type;
                    const isPast = sessionDate < now;
                    
                    let prefix = '•';
                    let color = '⚪'; // Default color for upcoming sessions
                    
                    if (isNext) {
                        prefix = '➡️';
                        color = '🟢'; // Green for next session
                    } else if (isPast) {
                        color = '⚫'; // Grey for past sessions
                    } else {
                        color = '🔵'; // Blue for upcoming sessions
                    }

                    return `${color} ${prefix} ${getSessionName(session.type)}: ${formatDateTime(session.date, session.time)}`;
                })
                .join('\n');

            const embed = new EmbedBuilder()
                .setColor(0xFF1801)
                .setTitle(`🏎️ ${nextRace.raceName} Schedule`)
                .setDescription(sessions)
                .addFields(
                    {
                        name: '📍 Circuit Information',
                        value: [
                            `**Circuit:** ${nextRace.Circuit.circuitName}`,
                            `**Country:** ${nextRace.Circuit.Location.country}`,
                            `**Round:** ${nextRace.round}`
                        ].join('\n')
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
            console.error('Error in /when command:', error);
            let errorMessage = 'An error occurred while fetching the schedule.';
            
            if (error.response) {
                console.error('API Error Response:', error.response.data);
                errorMessage = `API Error: ${error.response.status} - ${error.response.statusText}`;
            } else if (error.request) {
                console.error('No response received:', error.request);
                errorMessage = 'No response received from the API. Please try again later.';
            } else {
                console.error('Error details:', error.message);
            }

            await interaction.editReply({
                embeds: [createErrorEmbed(errorMessage)],
                ephemeral: true
            });
        }
    },
}; 