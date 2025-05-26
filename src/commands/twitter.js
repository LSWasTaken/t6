const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const db = require('../utils/database');
const { TwitterApi } = require('twitter-api-v2');

// Initialize Twitter client with Bearer Token
const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

// F1's Twitter username
const F1_TWITTER_USERNAME = 'F1';

// Constants
const CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const MAX_TWEETS = 3; // Reduced to 3 tweets per check to stay within free tier limits

// Create paginated embeds
const createTwitterEmbeds = () => {
    return [
        {
            color: 0x1DA1F2,
            title: '🐦 Twitter @F1 Notifications',
            description: 'Twitter @F1 notifications have been enabled in this channel.',
            fields: [
                {
                    name: '📢 What to Expect',
                    value: [
                        '• Official F1 announcements',
                        '• Race updates and results',
                        '• Driver and team news'
                    ].join('\n')
                }
            ],
            footer: {
                text: 'Page 1/3 • Use /settings to view all notification settings',
                icon_url: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
            }
        },
        {
            color: 0x1DA1F2,
            title: '🐦 Twitter @F1 Notifications',
            description: 'Twitter @F1 notifications have been enabled in this channel.',
            fields: [
                {
                    name: '📢 What to Expect (continued)',
                    value: [
                        '• Behind the scenes content',
                        '• Live session updates',
                        '• Exclusive content and insights'
                    ].join('\n')
                }
            ],
            footer: {
                text: 'Page 2/3 • Use /settings to view all notification settings',
                icon_url: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
            }
        },
        {
            color: 0x1DA1F2,
            title: '🐦 Twitter @F1 Notifications',
            description: 'Twitter @F1 notifications have been enabled in this channel.',
            fields: [
                {
                    name: '⚙️ Notification Details',
                    value: [
                        '• Updates from @F1',
                        '• Important announcements highlighted',
                        `• Checking for new tweets every 6 hours`,
                        '• Last 3 tweets will be shown'
                    ].join('\n')
                }
            ],
            footer: {
                text: 'Page 3/3 • Use /settings to view all notification settings',
                icon_url: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
            }
        }
    ];
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('twitter')
        .setDescription('Enable Twitter @F1 notifications'),

    async execute(interaction) {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({
                    embeds: [createErrorEmbed('You need Administrator permissions to use this command.')],
                    flags: 64
                });
            }

            await interaction.reply({
                embeds: [createLoadingEmbed()],
                flags: 64
            });

            // Get current settings
            const currentSettings = await db.getChannelSetting(interaction.channelId, 'twitterNotifications');
            
            if (currentSettings && currentSettings.enabled) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Twitter @F1 notifications are already enabled in this channel.')],
                    flags: 64
                });
            }

            // Verify Twitter API connection
            try {
                const user = await twitterClient.v2.userByUsername(F1_TWITTER_USERNAME);
                if (!user.data) {
                    throw new Error('Could not find F1 Twitter account');
                }
            } catch (error) {
                console.error('Twitter API Error:', error);
                return interaction.editReply({
                    embeds: [createErrorEmbed('Failed to connect to Twitter API. Please check the bot configuration.')],
                    flags: 64
                });
            }

            // Store channel setting in database
            await db.setChannelSetting(interaction.channelId, 'twitterNotifications', {
                enabled: true,
                lastNotified: null,
                lastTweetId: null,
                checkInterval: CHECK_INTERVAL
            });

            // Start periodic tweet checking
            const checkTweets = async () => {
                try {
                    const settings = await db.getChannelSetting(interaction.channelId, 'twitterNotifications');
                    if (!settings || !settings.enabled) return;

                    // Get tweets with minimal fields to reduce API usage
                    const tweets = await twitterClient.v2.userTimeline(F1_TWITTER_USERNAME, {
                        max_results: MAX_TWEETS,
                        'tweet.fields': ['created_at'] // Only fetch essential fields
                    });

                    if (!tweets.data || tweets.data.length === 0) return;

                    const channel = await interaction.client.channels.fetch(interaction.channelId);
                    if (!channel) return;

                    // Sort tweets by ID to ensure correct order
                    const sortedTweets = tweets.data.sort((a, b) => a.id.localeCompare(b.id));

                    // Send tweets in a single embed if there are multiple
                    if (sortedTweets.length > 0) {
                        const tweetList = sortedTweets.map(tweet => {
                            const date = new Date(tweet.created_at);
                            return `• [${date.toLocaleString()}] ${tweet.text}`;
                        }).join('\n\n');

                        await channel.send({
                            embeds: [{
                                color: 0x1DA1F2,
                                title: '🐦 Latest Tweets from @F1',
                                description: tweetList,
                                timestamp: new Date(),
                                footer: {
                                    text: `Formula 1 Bot • Twitter Updates • Next update in 6 hours`,
                                    icon_url: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                                }
                            }]
                        });

                        // Update last tweet ID
                        await db.setChannelSetting(interaction.channelId, 'twitterNotifications', {
                            ...settings,
                            lastTweetId: sortedTweets[sortedTweets.length - 1].id,
                            lastNotified: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error('Error checking tweets:', error);
                    // If we hit rate limits, wait longer before next check
                    if (error.code === 429) {
                        console.log('Rate limit hit, waiting longer before next check');
                        clearInterval(interval);
                        setTimeout(() => {
                            interval = setInterval(checkTweets, CHECK_INTERVAL);
                            checkTweets();
                        }, CHECK_INTERVAL * 2); // Wait twice as long
                    }
                }
            };

            // Start periodic checking
            let interval = setInterval(checkTweets, CHECK_INTERVAL);
            checkTweets(); // Initial check

            // Create buttons for pagination
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                );

            // Send initial embed with buttons
            const embeds = createTwitterEmbeds();
            const message = await interaction.editReply({
                embeds: [embeds[0]],
                components: [buttons]
            });

            // Create collector for button interactions
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000 // 5 minutes
            });

            let currentPage = 0;

            collector.on('collect', async (i) => {
                if (i.customId === 'next') {
                    currentPage++;
                } else if (i.customId === 'prev') {
                    currentPage--;
                }

                // Update buttons
                const newButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === embeds.length - 1)
                    );

                await i.update({
                    embeds: [embeds[currentPage]],
                    components: [newButtons]
                });
            });

            collector.on('end', () => {
                // Remove buttons when collector expires
                interaction.editReply({ components: [] }).catch(console.error);
            });
        } catch (error) {
            console.error('Error in /twitter command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while enabling Twitter notifications. Please try again later.')],
                flags: 64
            });
        }
    },
};