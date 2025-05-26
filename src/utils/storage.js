// In-memory storage for bot data
const storage = {
    // User settings
    userSettings: new Map(), // userId -> { timezone, weeklyAlerts }
    
    // Channel settings
    channelSettings: new Map(), // channelId -> { weeklyAlerts, autoEvents, notifications }
    
    // Trivia
    currentQuestions: new Map(), // channelId -> { question, options, answer }
    submittedQuestions: [], // Array of { question, options, answer, submittedBy }
    
    // Session data
    activeSessions: new Map(), // sessionId -> { type, startTime, endTime }
    
    // Methods to manage data
    setUserSetting(userId, setting, value) {
        if (!this.userSettings.has(userId)) {
            this.userSettings.set(userId, {});
        }
        const userData = this.userSettings.get(userId);
        userData[setting] = value;
    },
    
    getUserSetting(userId, setting) {
        const userData = this.userSettings.get(userId);
        return userData ? userData[setting] : null;
    },
    
    setChannelSetting(channelId, setting, value) {
        if (!this.channelSettings.has(channelId)) {
            this.channelSettings.set(channelId, {});
        }
        const channelData = this.channelSettings.get(channelId);
        channelData[setting] = value;
    },
    
    getChannelSetting(channelId, setting) {
        const channelData = this.channelSettings.get(channelId);
        return channelData ? channelData[setting] : null;
    },
    
    setCurrentQuestion(channelId, question, options, answer) {
        this.currentQuestions.set(channelId, { question, options, answer });
    },
    
    getCurrentQuestion(channelId) {
        return this.currentQuestions.get(channelId);
    },
    
    addSubmittedQuestion(question, options, answer, submittedBy) {
        this.submittedQuestions.push({ question, options, answer, submittedBy });
    },
    
    getSubmittedQuestions() {
        return this.submittedQuestions;
    },
    
    setActiveSession(sessionId, type, startTime, endTime) {
        this.activeSessions.set(sessionId, { type, startTime, endTime });
    },
    
    getActiveSession(sessionId) {
        return this.activeSessions.get(sessionId);
    },
    
    clearActiveSession(sessionId) {
        this.activeSessions.delete(sessionId);
    }
};

module.exports = storage; 