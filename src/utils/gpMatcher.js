const { EmbedBuilder } = require('discord.js');

// List of all Grand Prix names
const GRAND_PRIX = [
    'Australian Grand Prix',
    'Bahrain Grand Prix',
    'Chinese Grand Prix',
    'Azerbaijan Grand Prix',
    'Miami Grand Prix',
    'Emilia Romagna Grand Prix',
    'Monaco Grand Prix',
    'Spanish Grand Prix',
    'Canadian Grand Prix',
    'Austrian Grand Prix',
    'British Grand Prix',
    'Hungarian Grand Prix',
    'Belgian Grand Prix',
    'Dutch Grand Prix',
    'Italian Grand Prix',
    'Singapore Grand Prix',
    'Japanese Grand Prix',
    'Qatar Grand Prix',
    'United States Grand Prix',
    'Mexico City Grand Prix',
    'São Paulo Grand Prix',
    'Las Vegas Grand Prix',
    'Abu Dhabi Grand Prix'
];

/**
 * Finds matching Grand Prix names based on a search string
 * @param {string} search - The search string
 * @returns {Array<string>} Array of matching GP names
 */
function findMatchingGPs(search) {
    const searchLower = search.toLowerCase();
    return GRAND_PRIX.filter(gp => 
        gp.toLowerCase().includes(searchLower) ||
        gp.toLowerCase().replace(' grand prix', '').includes(searchLower)
    );
}

/**
 * Creates an embed for GP selection when multiple matches are found
 * @param {Array<string>} matches - Array of matching GP names
 * @returns {EmbedBuilder} The formatted embed
 */
function createGPSelectionEmbed(matches) {
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Multiple Grand Prix Found')
        .setDescription('Please specify which Grand Prix you want to see:')
        .addFields(
            matches.map((gp, index) => ({
                name: `${index + 1}. ${gp}`,
                value: 'Use the full name or round number'
            }))
        );

    return embed;
}

module.exports = {
    findMatchingGPs,
    createGPSelectionEmbed,
    GRAND_PRIX
}; 