const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Start a Formula 1 trivia game'),

    async execute(interaction) {
        try {
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                flags: 64
            });

            // Get approved questions from database
            const questions = await db.getTriviaQuestions('approved');
            
            if (!questions || questions.length === 0) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('No trivia questions available at the moment.')],
                    flags: 64
                });
            }

            // Select a random question
            const question = questions[Math.floor(Math.random() * questions.length)];

            // Create options string
            const optionsText = question.options
                .map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)
                .join('\n');

            // Store current question in database
            await db.setCurrentQuestion(interaction.channelId, question.question, question.options, question.answer);

            await interaction.editReply({
                embeds: [{
                    color: 0xFF1801,
                    title: '🎮 Formula 1 Trivia',
                    description: question.question,
                    fields: [
                        {
                            name: 'Options',
                            value: optionsText
                        }
                    ],
                    footer: {
                        text: 'Use /guess to submit your answer',
                        icon_url: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                    }
                }]
            });
        } catch (error) {
            console.error('Error in /trivia command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while starting the trivia game. Please try again later.')],
                flags: 64
            });
        }
    },
}; 