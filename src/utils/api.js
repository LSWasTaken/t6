const axios = require('axios');

// API Configuration
const API_BASE = 'https://api.jolpi.ca/ergast/f1';
const OPENF1_API_BASE = 'https://api.openf1.org/v1';
const TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 500;

// Cache for live session data
let liveSessionCache = {
    data: null,
    timestamp: 0
};
const CACHE_DURATION = 5000; // 5 seconds cache

// Custom error class for API errors
class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Helper function to handle API requests with retries
async function fetchWithRetry(url, retries = MAX_RETRIES) {
    try {
        // Add format=json parameter if not present
        const formattedUrl = url.includes('?') ? `${url}&format=json` : `${url}?format=json`;
        
        const response = await axios.get(formattedUrl, {
            timeout: TIMEOUT,
            headers: {
                'Accept': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            // Handle specific HTTP errors
            switch (error.response.status) {
                case 404:
                    throw new APIError('Data not found. The requested race or session may not be available yet.', 404, error.response.data);
                case 429:
                    throw new APIError('Too many requests. Please try again later.', 429, error.response.data);
                case 500:
                    if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                        return fetchWithRetry(url, retries - 1);
                    }
                    throw new APIError('Server error. Please try again later.', 500, error.response.data);
                default:
                    throw new APIError(`API request failed: ${error.response.statusText}`, error.response.status, error.response.data);
            }
        } else if (error.code === 'ECONNABORTED' && retries > 0) {
            // Handle timeout
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return fetchWithRetry(url, retries - 1);
        }
        throw new APIError('Failed to connect to the API. Please check your internet connection.', 0, error.message);
    }
}

// OpenF1 API Endpoints
const OPENF1_ENDPOINTS = {
    CAR_DATA: '/car_data',
    DRIVERS: '/drivers',
    INTERVALS: '/intervals',
    LAPS: '/laps',
    LOCATION: '/location',
    MEETINGS: '/meetings',
    PIT: '/pit',
    POSITION: '/position',
    RACE_CONTROL: '/race_control',
    SESSIONS: '/sessions',
    STINTS: '/stints',
    TEAM_RADIO: '/team_radio',
    WEATHER: '/weather'
};

// Live session data
async function getLiveSession() {
    try {
        // Check cache first
        const now = Date.now();
        if (liveSessionCache.data && (now - liveSessionCache.timestamp) < CACHE_DURATION) {
            return liveSessionCache.data;
        }

        // Get current session info
        const sessions = await fetchWithRetry(`${OPENF1_API_BASE}${OPENF1_ENDPOINTS.SESSIONS}`);
        const activeSession = sessions.find(session => session.status === 'active');
        
        if (!activeSession) {
            return null;
        }

        // Fetch essential data in parallel with individual error handling
        const fetchData = async (endpoint) => {
            try {
                return await fetchWithRetry(`${OPENF1_API_BASE}${endpoint}`);
            } catch (error) {
                console.warn(`Failed to fetch ${endpoint} data:`, error.message);
                return null;
            }
        };

        const [position, drivers, weather, raceControl] = await Promise.all([
            fetchData(OPENF1_ENDPOINTS.POSITION),
            fetchData(OPENF1_ENDPOINTS.DRIVERS),
            fetchData(OPENF1_ENDPOINTS.WEATHER),
            fetchData(OPENF1_ENDPOINTS.RACE_CONTROL)
        ]);

        // Create response object with available data
        const data = {
            session: activeSession,
            position: position || [],
            drivers: drivers || [],
            weather: weather || null,
            raceControl: raceControl || []
        };

        // Update cache
        liveSessionCache = {
            data,
            timestamp: now
        };

        return data;
    } catch (error) {
        console.error('Error in getLiveSession:', error.message);
        // Return null instead of throwing to allow graceful handling
        return null;
    }
}

// Get detailed live data for a specific type
async function getLiveData(type) {
    try {
        if (!OPENF1_ENDPOINTS[type]) {
            console.warn(`Invalid live data type requested: ${type}`);
            return null;
        }

        const data = await fetchWithRetry(`${OPENF1_API_BASE}${OPENF1_ENDPOINTS[type]}`);
        return data;
    } catch (error) {
        console.warn(`Error fetching ${type} data:`, error.message);
        return null;
    }
}

// Race results
async function getRaceResults(year, round) {
    try {
        // Validate year
        const currentYear = new Date().getFullYear();
        if (year > currentYear + 1) {
            throw new APIError(`Race data for ${year} is not yet available.`, 400);
        }

        const endpoint = round 
            ? `${API_BASE}/${year}/${round}/results`
            : `${API_BASE}/${year}/results`;
        const data = await fetchWithRetry(endpoint);
        return data;
    } catch (error) {
        console.error('Error fetching race results:', error);
        throw error;
    }
}

// Qualifying results
async function getQualifyingResults(year, round) {
    try {
        // Validate year
        const currentYear = new Date().getFullYear();
        if (year > currentYear + 1) {
            throw new APIError(`Qualifying data for ${year} is not yet available.`, 400);
        }

        const endpoint = round 
            ? `${API_BASE}/${year}/${round}/qualifying`
            : `${API_BASE}/${year}/qualifying`;
        const data = await fetchWithRetry(endpoint);
        return data;
    } catch (error) {
        console.error('Error fetching qualifying results:', error);
        throw error;
    }
}

// Fastest lap
async function getFastestLap(year, round) {
    try {
        // Validate year
        const currentYear = new Date().getFullYear();
        if (year > currentYear + 1) {
            throw new APIError(`Fastest lap data for ${year} is not yet available.`, 400);
        }

        const endpoint = round 
            ? `${API_BASE}/${year}/${round}/laps`
            : `${API_BASE}/${year}/laps`;
        const data = await fetchWithRetry(endpoint);
        return data;
    } catch (error) {
        console.error('Error fetching fastest lap data:', error);
        throw error;
    }
}

// Get driver standings
async function getDriverStandings(year) {
    try {
        const endpoint = `${API_BASE}/${year}/driverstandings`;
        const data = await fetchWithRetry(endpoint);
        return data;
    } catch (error) {
        console.error('Error fetching driver standings:', error);
        throw error;
    }
}

// Get constructor standings
async function getConstructorStandings(year) {
    try {
        const endpoint = `${API_BASE}/${year}/constructorstandings`;
        const data = await fetchWithRetry(endpoint);
        return data;
    } catch (error) {
        console.error('Error fetching constructor standings:', error);
        throw error;
    }
}

// Get sprint results
async function getSprintResults(year, round) {
    try {
        const endpoint = round 
            ? `${API_BASE}/${year}/${round}/sprint`
            : `${API_BASE}/${year}/sprint`;
        const data = await fetchWithRetry(endpoint);
        return data;
    } catch (error) {
        console.error('Error fetching sprint results:', error);
        throw error;
    }
}

// Get current season schedule
async function getCurrentSchedule() {
    try {
        const currentYear = new Date().getFullYear();
        const endpoint = `${API_BASE}/${currentYear}`;
        const data = await fetchWithRetry(endpoint);
        return data;
    } catch (error) {
        console.error('Error fetching current schedule:', error);
        throw error;
    }
}

// Get driver status statistics
async function getDriverStatus(year, round, driver, constructor) {
    try {
        let endpoint = `${API_BASE}/status`;
    
        // Add filters if provided
        if (year) {
            endpoint = `${API_BASE}/${year}/status`;
            if (round) {
                endpoint = `${API_BASE}/${year}/${round}/status`;
            }
        }
        if (driver) {
            endpoint = `${API_BASE}/drivers/${driver}/status`;
        }
        if (constructor) {
            endpoint = `${API_BASE}/constructors/${constructor}/status`;
        }

        const data = await fetchWithRetry(endpoint);
        return data;
    } catch (error) {
        console.error('Error fetching driver status:', error);
        throw error;
    }
}

module.exports = {
    getLiveSession,
    getLiveData,
    getRaceResults,
    getQualifyingResults,
    getFastestLap,
    getDriverStandings,
    getConstructorStandings,
    getSprintResults,
    getCurrentSchedule,
    getDriverStatus,
    APIError,
    OPENF1_ENDPOINTS
}; 