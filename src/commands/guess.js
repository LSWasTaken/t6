const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guess')
        .setDescription('Submit your answer to the current trivia question')
        .addStringOption(option =>
            option.setName('answer')
                .setDescription('Your answer (A, B, C, or D)')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                flags: 64
            });

            const answer = interaction.options.getString('answer').toUpperCase();

            // Validate answer format
            if (!['A', 'B', 'C', 'D'].includes(answer)) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Please provide a valid answer (A, B, C, or D).')],
                    flags: 64
                });
            }

            // Get current question from database
            const currentQuestion = await db.getCurrentQuestion(interaction.channelId);
            
            if (!currentQuestion) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('No active trivia question found. Use /trivia to start a new game.')],
                    flags: 64
                });
            }

            // Check if answer is correct
            const correctAnswerIndex = currentQuestion.options.indexOf(currentQuestion.answer);
            const correctAnswerLetter = String.fromCharCode(65 + correctAnswerIndex);
            const isCorrect = answer === correctAnswerLetter;

            await interaction.editReply({
                embeds: [{
                    color: isCorrect ? 0x00FF00 : 0xFF0000,
                    title: '🎮 Trivia Answer',
                    description: isCorrect 
                        ? '✅ Correct! Well done!'
                        : `❌ Incorrect. The correct answer was ${correctAnswerLetter}.`,
                    fields: [
                        {
                            name: 'Question',
                            value: currentQuestion.question
                        },
                        {
                            name: 'Correct Answer',
                            value: currentQuestion.answer
                        }
                    ],
                    footer: {
                        text: 'Formula 1 Bot',
                        icon_url: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                    }
                }]
            });

            // Clear the current question after it's been answered
            await db.clearCurrentQuestion(interaction.channelId);
        } catch (error) {
            console.error('Error in /guess command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while checking your answer. Please try again later.')],
                flags: 64
            });
        }
    },
}; 