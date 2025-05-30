# F1 Discord Bot

Discord bot that provides Formula 1 information, including race schedules, driver details, live timing, and more.

## Features

### Race Information
- 🏎️ `/driver` - Get detailed information about any F1 driver, including their headshot and biographical data
- 📅 `/when` - View upcoming race schedules and session times
- 🏁 `/race` - Get race results and information
- ⏱️ `/qualifying` - View qualifying results
- 🏃 `/sprint` - Check sprint race results
- 🏆 `/standings` - View current championship standings
- 🏎️ `/team` - Get information about F1 teams
- 🗺️ `/map` - View the circuit layout for upcoming races

### Live Features
- 📊 `/live` - Get real-time race information
- ⚡ `/fastestlap` - Track fastest lap times
- 🚦 `/status` - Check current session status

### Interactive Features
- 🎮 `/guess` - Play F1-related guessing games
- ❓ `/question` - Test your F1 knowledge
- 🎲 `/trivia` - Challenge yourself with F1 trivia
- 🏎️ `/dwa` and `/ewa` - Driver and Event auto-event features

### Utility Commands
- ⚙️ `/settings` - Configure bot settings
- 🌍 `/timezone` - Set your timezone for local time display
- ❓ `/help` - Get help with bot commands

## Setup

1. Clone the repository:
```bash
git clone https://github.com/LSWasTaken/t6.git
cd t6
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
DISCORD_TOKEN=
CLIENT_ID=

# Optional: base URLs for Jolpica and OpenF1 data sources
JOLPICA_BASE_URL=
OPENF1_BASE_URL=
MONGODB_URI=
TWITTER_BEARER_TOKEN=


# Optional: HTTP request timeout in milliseconds (default: 10000)
HTTP_TIMEOUT=10000

# Optional: max retries for rate-limiting/backoff (default: 3)
MAX_RETRIES=3
```

4. Deploy the commands:
```bash
node src/deploy-commands.js
```

5. Start the bot:
```bash
node src/index.js
```

## Technologies Used

- Discord.js - Discord API wrapper
- Node.js - Runtime environment
- Axios - HTTP client for API requests
- OpenF1 API - Real-time F1 data
- Ergast API - F1 historical data
- Wikipedia API - Driver information and images

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License - see the LICENSE file for details.
