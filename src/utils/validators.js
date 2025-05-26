/**
 * Validates a year parameter
 * @param {number} year - The year to validate
 * @returns {boolean} Whether the year is valid
 */
function isValidYear(year) {
    const currentYear = new Date().getFullYear();
    // Allow years from 1950 (first F1 season) to current year + 1
    return year >= 1950 && year <= currentYear + 1;
}

module.exports = {
    isValidYear
}; 