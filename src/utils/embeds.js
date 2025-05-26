const { EmbedBuilder } = require('discord.js');

// Color constants
const LIVE_COLOR = 0x00FF00; // Green for live sessions
const HISTORICAL_COLOR = 0x0099FF; // Blue for historical data
const ERROR_COLOR = 0xFF0000; // Red for errors
const LOADING_COLOR = 0x808080; // Gray for loading

// Flag status emojis
const FLAG_EMOJIS = {
    GREEN: '🟢',
    YELLOW: '🟡',
    RED: '🟥',
    SAFETY_CAR: '🚗',
    VIRTUAL_SC: '⚠️'
};

// Tire compound emojis
const TIRE_EMOJIS = {
    SOFT: '🔴',
    MEDIUM: '🟡',
    HARD: '⚪',
    INTERMEDIATE: '🟢',
    WET: '🔵'
};

const SESSION_STATUS = {
    RACE: {
        STARTED: 'Race in Progress',
        FINISHED: 'Race Finished',
        RED_FLAGGED: 'Race Red Flagged',
        SAFETY_CAR: 'Safety Car Deployed',
        VIRTUAL_SC: 'Virtual Safety Car Deployed'
    },
    QUALIFYING: {
        Q1: 'Q1 in Progress',
        Q2: 'Q2 in Progress',
        Q3: 'Q3 in Progress',
        FINISHED: 'Qualifying Finished'
    },
    PRACTICE: {
        STARTED: 'Practice in Progress',
        FINISHED: 'Practice Finished'
    }
};

function getDetailedSessionStatus(sessionData) {
    const { sessionType, status, currentLap, totalLaps } = sessionData;
    
    if (status === 'finished') {
        return SESSION_STATUS[sessionType]?.FINISHED || 'Session Finished';
    }

    if (sessionType === 'RACE') {
        if (sessionData.flagStatus === 'RED') return SESSION_STATUS.RACE.RED_FLAGGED;
        if (sessionData.flagStatus === 'SAFETY_CAR') return SESSION_STATUS.RACE.SAFETY_CAR;
        if (sessionData.flagStatus === 'VIRTUAL_SC') return SESSION_STATUS.RACE.VIRTUAL_SC;
        return `${SESSION_STATUS.RACE.STARTED} - Lap ${currentLap}/${totalLaps}`;
    }

    if (sessionType === 'QUALIFYING') {
        // Determine which qualifying session is active based on remaining drivers
        if (currentLap <= 15) return SESSION_STATUS.QUALIFYING.Q1;
        if (currentLap <= 30) return SESSION_STATUS.QUALIFYING.Q2;
        return SESSION_STATUS.QUALIFYING.Q3;
    }

    return SESSION_STATUS.PRACTICE.STARTED;
}

/**
 * Creates an embed for live session data
 * @param {Object} session - The session data
 * @param {Object} timing - The timing data
 * @returns {EmbedBuilder} The formatted embed
 */
function createLiveSessionEmbed(data) {
    const { session, position, drivers, weather } = data;

    const embed = new EmbedBuilder()
        .setColor('#FF1801')
        .setTitle(`${session.name} - ${session.type}`)
        .setDescription(`**Status**: ${session.status}\n**Weather**: ${weather?.air_temperature ? `${weather.air_temperature}°C` : 'Unknown'}`)
        .setFooter({ 
            text: `Session started at ${new Date(session.start_time).toLocaleTimeString()}`,
            iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
        });

    // Add driver positions if available
    if (position && position.length > 0) {
        const positions = position
            .sort((a, b) => a.position - b.position)
            .slice(0, 10)
            .map(p => {
                const driver = drivers.find(d => d.driver_number === p.driver_number);
                return `${p.position}. ${driver?.full_name || `Driver ${p.driver_number}`}`;
            })
            .join('\n');

        embed.addFields({
            name: '🏁 Current Positions',
            value: positions || 'No position data available'
        });
    }

    return embed;
}

/**
 * Creates an embed for race results
 * @param {Object} data - The race results data
 * @returns {EmbedBuilder} The formatted embed
 */
function createRaceResultsEmbed(data) {
    // Extract data from Ergast API response
    const raceData = data.MRData.RaceTable.Races[0];
    if (!raceData) {
        throw new Error('No race data available');
    }

    const results = raceData.Results.map(result => ({
        position: result.position,
        driver: `${result.Driver.givenName} ${result.Driver.familyName}`,
        team: result.Constructor.name,
        status: result.status,
        points: result.points
    }));

    const fastestLap = raceData.Results.find(r => r.FastestLap?.rank === '1');
    const winner = results[0];

    return new EmbedBuilder()
        .setColor('#FF1801')
        .setTitle(`${raceData.season} ${raceData.raceName} Grand Prix Results`)
        .setDescription(`**Circuit**: ${raceData.Circuit.circuitName}\n**Total Laps**: ${raceData.Results[0]?.laps || 'N/A'}`)
        .addFields(
            {
                name: '🏆 Winner',
                value: `${winner.driver} (${winner.team})`
            },
            {
                name: '⚡ Fastest Lap',
                value: fastestLap ? 
                    `${fastestLap.Driver.givenName} ${fastestLap.Driver.familyName} (${fastestLap.Constructor.name}) - ${fastestLap.FastestLap.Time.time}` :
                    'No fastest lap data available'
            },
            {
                name: '🏁 Race Results',
                value: results.map(result => 
                    `${result.position}. ${result.driver} (${result.team})${result.status ? ` - ${result.status}` : ''}`
                ).join('\n')
            }
        )
        .setFooter({ 
            text: 'Formula 1 Bot',
            iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
        });
}

/**
 * Creates an embed for qualifying results
 * @param {Object} data - The qualifying results data
 * @returns {EmbedBuilder} The formatted embed
 */
function createQualifyingEmbed(data, page = 0) {
    const race = data.MRData.RaceTable.Races[0];
    const results = race.QualifyingResults;
    const driversPerPage = 10;
    const totalPages = Math.ceil(results.length / driversPerPage);
    
    // Get drivers for current page
    const startIndex = page * driversPerPage;
    const pageResults = results.slice(startIndex, startIndex + driversPerPage);

    // Format results for current page
    const resultsText = pageResults.map((result, index) => {
        const driver = result.Driver;
        const constructor = result.Constructor;
        const q1 = result.Q1 || 'N/A';
        const q2 = result.Q2 || 'N/A';
        const q3 = result.Q3 || 'N/A';
        return `${startIndex + index + 1}. ${driver.givenName} ${driver.familyName} (${constructor.name})\nQ1: ${q1} | Q2: ${q2} | Q3: ${q3}`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
        .setColor('#FF1801')
        .setTitle(`🏎️ ${race.raceName} Qualifying Results`)
        .setDescription(`${race.Circuit.circuitName} - ${race.date}`)
        .addFields(
            {
                name: '🏆 Qualifying Results',
                value: resultsText
            }
        );

    // Add pole position information if we're on the first page
    if (page === 0 && results.length > 0) {
        const pole = results[0];
        embed.addFields({
            name: '🥇 Pole Position',
            value: `${pole.Driver.givenName} ${pole.Driver.familyName} (${pole.Constructor.name})\nQ3 Time: ${pole.Q3 || 'N/A'}`
        });
    }

    // Add page information
    embed.setFooter({ 
        text: `Page ${page + 1}/${totalPages}`,
        iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
    });

    return {
        embed,
        totalPages,
        currentPage: page
    };
}

/**
 * Creates an embed for fastest lap data
 * @param {Object} data - The fastest lap data
 * @returns {EmbedBuilder} The formatted embed
 */
function createFastestLapEmbed(data) {
    // Extract data from Ergast API response
    const raceData = data?.MRData?.RaceTable?.Races?.[0];
    if (!raceData) {
        throw new Error('No race data available');
    }

    const fastestLap = raceData.Results?.find(r => r.FastestLap?.rank === '1');
    if (!fastestLap) {
        throw new Error('No fastest lap data available');
    }

    return new EmbedBuilder()
        .setColor('#FF1801')
        .setTitle(`${raceData.season} ${raceData.raceName} Grand Prix Fastest Lap`)
        .setDescription(`**Circuit**: ${raceData.Circuit?.circuitName || 'Unknown'}`)
        .addFields(
            {
                name: '⚡ Fastest Lap',
                value: `${fastestLap.Driver?.givenName || 'Unknown'} ${fastestLap.Driver?.familyName || 'Driver'} (${fastestLap.Constructor?.name || 'Unknown Team'})`
            },
            {
                name: '📊 Lap Details',
                value: `**Lap Number**: ${fastestLap.FastestLap?.lap || 'N/A'}\n**Time**: ${fastestLap.FastestLap?.Time?.time || 'N/A'}\n**Average Speed**: ${fastestLap.FastestLap?.AverageSpeed?.speed || 'N/A'} ${fastestLap.FastestLap?.AverageSpeed?.units || 'km/h'}`
            }
        )
        .setFooter({ 
            text: 'Formula 1 Bot',
            iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
        });
}

/**
 * Creates an embed for error messages
 * @param {string} message - The error message
 * @returns {EmbedBuilder} The formatted embed
 */
function createErrorEmbed(message) {
    return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Error')
        .setDescription(message)
        .setFooter({ 
            text: 'Formula 1 Bot',
            iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
        });
}

/**
 * Creates an embed for loading state
 * @returns {EmbedBuilder} The formatted embed
 */
function createLoadingEmbed() {
    return new EmbedBuilder()
        .setColor('#FF1801')
        .setTitle('Loading...')
        .setDescription('Fetching Formula 1 data...')
        .setFooter({ 
            text: 'Please wait while we retrieve the information.',
            iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
        });
}

function createScheduleEmbed(data) {
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const races = data.MRData.RaceTable.Races;

    // Sort races by date
    races.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Format each race with color indicators
    const raceList = races.map(race => {
        const raceDate = new Date(race.date);
        const isPast = raceDate < now;
        const isNext = !isPast && races.findIndex(r => new Date(r.date) > now) === races.indexOf(race);
        
        let indicator = '⚫'; // Default for past races
        if (isNext) {
            indicator = '🟢'; // Next upcoming race
        } else if (!isPast) {
            indicator = '🔵'; // Future races
        }

        const date = new Date(race.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });

        return `${indicator} **${race.round}.** ${race.raceName} - ${date}`;
    }).join('\n');

    return new EmbedBuilder()
        .setColor('#FF1801')
        .setTitle(`${currentYear} Formula 1 Season Schedule`)
        .setDescription(raceList)
        .setFooter({ 
            text: '🟢 Next Race | 🔵 Upcoming | ⚫ Completed',
            iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
        });
}

function createStatusEmbed(data, filter) {
    const statuses = data.MRData.StatusTable.Status;
    
    // Sort statuses by count (most frequent first)
    statuses.sort((a, b) => parseInt(b.count) - parseInt(a.count));

    // Format the title based on filters
    let title = 'Formula 1 Status Statistics';
    if (filter) {
        title += ` - ${filter}`;
    }

    // Format each status with emoji
    const statusList = statuses.map(status => {
        let emoji = '⚪'; // Default
        const statusText = status.status.toLowerCase();
        
        if (statusText.includes('finished')) emoji = '✅';
        else if (statusText.includes('retired')) emoji = '❌';
        else if (statusText.includes('accident')) emoji = '💥';
        else if (statusText.includes('engine')) emoji = '🔧';
        else if (statusText.includes('gearbox')) emoji = '⚙️';
        else if (statusText.includes('transmission')) emoji = '⚙️';
        else if (statusText.includes('suspension')) emoji = '🔧';
        else if (statusText.includes('brake')) emoji = '🛑';
        else if (statusText.includes('electrical')) emoji = '⚡';
        else if (statusText.includes('hydraulics')) emoji = '💧';
        else if (statusText.includes('fuel')) emoji = '⛽';
        else if (statusText.includes('tire')) emoji = '🛞';
        else if (statusText.includes('wheel')) emoji = '🛞';
        else if (statusText.includes('collision')) emoji = '💥';
        else if (statusText.includes('spin')) emoji = '🌀';
        else if (statusText.includes('lapped')) emoji = '⏱️';
        else if (statusText.includes('disqualified')) emoji = '🚫';
        else if (statusText.includes('excluded')) emoji = '🚫';
        else if (statusText.includes('not classified')) emoji = '❓';
        else if (statusText.includes('withdrawn')) emoji = '↩️';

        return `${emoji} **${status.status}**: ${status.count} times`;
    }).join('\n');

    return new EmbedBuilder()
        .setColor('#FF1801')
        .setTitle(title)
        .setDescription(statusList)
        .setFooter({ 
            text: 'Formula 1 Bot',
            iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
        });
}

module.exports = {
    createLoadingEmbed,
    createErrorEmbed,
    createLiveSessionEmbed,
    createRaceResultsEmbed,
    createQualifyingEmbed,
    createFastestLapEmbed,
    createScheduleEmbed,
    createStatusEmbed,
    SESSION_STATUS,
    FLAG_EMOJIS,
    TIRE_EMOJIS
}; 