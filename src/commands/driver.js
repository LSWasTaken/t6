const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');

// Country code to flag emoji mapping
const countryFlags = {
    'GBR': '🇬🇧', // Great Britain
    'ESP': '🇪🇸', // Spain
    'MEX': '🇲🇽', // Mexico
    'MON': '🇲🇨', // Monaco
    'NED': '🇳🇱', // Netherlands
    'AUS': '🇦🇺', // Australia
    'CAN': '🇨🇦', // Canada
    'CHN': '🇨🇳', // China
    'DEN': '🇩🇰', // Denmark
    'FIN': '🇫🇮', // Finland
    'FRA': '🇫🇷', // France
    'DEU': '🇩🇪', // Germany
    'GER': '🇩🇪', // Germany (alternative code)
    'ITA': '🇮🇹', // Italy
    'JPN': '🇯🇵', // Japan
    'NZL': '🇳🇿', // New Zealand
    'RUS': '🇷🇺', // Russia
    'THA': '🇹🇭', // Thailand
    'USA': '🇺🇸', // United States
    'VEN': '🇻🇪', // Venezuela
    'BRA': '🇧🇷', // Brazil
    'CHE': '🇨🇭', // Switzerland
    'JOR': '🇯🇴', // Jordan
    'IND': '🇮🇳', // India
    'MYS': '🇲🇾', // Malaysia
    'POL': '🇵🇱', // Poland
    'SWE': '🇸🇪', // Sweden
    'AUT': '🇦🇹', // Austria
    'BEL': '🇧🇪', // Belgium
    'COL': '🇨🇴', // Colombia
    'IDN': '🇮🇩', // Indonesia
    'IRL': '🇮🇪', // Ireland
    'LUX': '🇱🇺', // Luxembourg
    'PRT': '🇵🇹', // Portugal
    'SGP': '🇸🇬', // Singapore
    'ZAF': '🇿🇦', // South Africa
    'TUR': '🇹🇷', // Turkey
    'ARE': '🇦🇪', // United Arab Emirates
    'ARG': '🇦🇷', // Argentina
    'CHL': '🇨🇱', // Chile
    'CZE': '🇨🇿', // Czech Republic
    'DNK': '🇩🇰', // Denmark (alternative code)
    'EST': '🇪🇪', // Estonia
    'GRC': '🇬🇷', // Greece
    'HKG': '🇭🇰', // Hong Kong
    'HRV': '🇭🇷', // Croatia
    'HUN': '🇭🇺', // Hungary
    'ISR': '🇮🇱', // Israel
    'KOR': '🇰🇷', // South Korea
    'LTU': '🇱🇹', // Lithuania
    'LVA': '🇱🇻', // Latvia
    'MCO': '🇲🇨', // Monaco (alternative code)
    'MDA': '🇲🇩', // Moldova
    'MNG': '🇲🇳', // Mongolia
    'NOR': '🇳🇴', // Norway
    'PHL': '🇵🇭', // Philippines
    'ROU': '🇷🇴', // Romania
    'SAU': '🇸🇦', // Saudi Arabia
    'SVK': '🇸🇰', // Slovakia
    'SVN': '🇸🇮', // Slovenia
    'TWN': '🇹🇼', // Taiwan
    'UKR': '🇺🇦', // Ukraine
    'VNM': '��🇳', // Vietnam
    'ZWE': '🇿🇼'  // Zimbabwe
};

// Calculate age from date of birth
const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
};

// Find exact driver match
const findDriver = (drivers, query) => {
    query = query.toLowerCase();
    return drivers.find(driver => 
        driver.first_name.toLowerCase() === query ||
        driver.last_name.toLowerCase() === query ||
        driver.name_acronym.toLowerCase() === query ||
        driver.driver_number.toString() === query ||
        `${driver.first_name.toLowerCase()} ${driver.last_name.toLowerCase()}` === query
    );
};

// Fetch Wikipedia data for driver
const fetchWikipediaData = async (driverName) => {
    try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(driverName)}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error fetching Wikipedia data:', error);
        return null;
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('driver')
        .setDescription('Search for Formula 1 driver information')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Driver name, code, or number (e.g., Hamilton, HAM, 44)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('session')
                .setDescription('Session key (optional)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                ephemeral: true
            });

            const query = interaction.options.getString('query');
            const sessionKey = interaction.options.getInteger('session');

            // Build API URL for 2025 season
            let apiUrl = 'https://api.openf1.org/v1/drivers?meeting_key=1261'; // 2025 season meeting key
            if (sessionKey) {
                apiUrl += `&session_key=${sessionKey}`;
            }

            // Fetch drivers data from OpenF1 API
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch driver data');
            }

            const drivers = await response.json();
            if (!Array.isArray(drivers) || drivers.length === 0) {
                throw new Error('Invalid driver data received');
            }

            // Find exact driver match
            const driver = findDriver(drivers, query);

            if (!driver) {
                return interaction.editReply({
                    embeds: [createErrorEmbed(`No driver found matching "${query}". Try searching by full name, code (e.g., HAM), or number (e.g., 44).`)],
                    ephemeral: true
                });
            }

            // Fetch Wikipedia data
            const wikiData = await fetchWikipediaData(`${driver.first_name}_${driver.last_name}`);

            const countryFlag = driver.country_code ? countryFlags[driver.country_code] || '🏳️' : '🏳️';
            const countryInfo = driver.country_code ? `${countryFlag} ${driver.country_code}` : '🏳️ Unknown';

            await interaction.editReply({
                embeds: [{
                    color: 0xFF1801,
                    title: `🏎️ ${driver.first_name} ${driver.last_name}`,
                    description: [
                        `**Driver Information**`,
                        `• Number: #${driver.driver_number}`,
                        `• Code: ${driver.name_acronym}`,
                        `• Team: ${driver.team_name}`,
                        `• Nationality: ${countryInfo}`,
                        '',
                        `**2025 Season Status**`,
                        `• Broadcast Name: ${driver.broadcast_name}`,
                        sessionKey ? `• Session Key: ${sessionKey}` : '',
                        '',
                        wikiData?.extract ? `**About**\n${wikiData.extract.split('.')[0]}.` : '',
                        '',
                        `[Wikipedia Profile](${wikiData?.content_urls?.desktop?.page || ''})`
                    ].filter(Boolean).join('\n'),
                    thumbnail: {
                        url: wikiData?.thumbnail?.source || driver.headshot_url || ''
                    },
                    footer: {
                        text: 'Formula 1 Bot - 2025 Season',
                        iconURL: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                    }
                }],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in /driver command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while searching for driver information. Please try again later.')],
                ephemeral: true
            });
        }
    },
}; 