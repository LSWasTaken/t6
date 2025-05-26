# F1 Discord Bot

A feature-rich Discord bot that provides Formula 1 information, including race schedules, driver details, live timing, and more.

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

### Local Setup

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
DISCORD_TOKEN=your_discord_bot_token
```

4. Deploy the commands:
```bash
node src/deploy-commands.js
```

5. Start the bot:
```bash
node src/index.js
```

### Replit Setup

1. Fork this repository to your GitHub account
2. Go to [Replit](https://replit.com) and create a new Repl
3. Choose "Import from GitHub" and select your forked repository
4. In the Replit shell, run:
```bash
npm install
```
5. Add your environment variables in Replit:
   - Click on "Tools" in the left sidebar
   - Select "Secrets"
   - Add your `DISCORD_TOKEN` as a secret
6. Deploy the commands:
```bash
node src/deploy-commands.js
```
7. Click the "Run" button to start the bot

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
