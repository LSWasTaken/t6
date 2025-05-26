const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createLoadingEmbed } = require('../utils/embeds');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('question')
        .setDescription('Suggest a question for the Formula 1 trivia')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Your trivia question')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('answer')
                .setDescription('The correct answer')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option1')
                .setDescription('First wrong option')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option2')
                .setDescription('Second wrong option')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option3')
                .setDescription('Third wrong option')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.reply({
                embeds: [createLoadingEmbed()],
                flags: 64
            });

            const question = interaction.options.getString('question');
            const answer = interaction.options.getString('answer');
            const option1 = interaction.options.getString('option1');
            const option2 = interaction.options.getString('option2');
            const option3 = interaction.options.getString('option3');

            // Store question in database
            await db.addTriviaQuestion(
                question,
                [answer, option1, option2, option3],
                answer,
                interaction.user.id
            );

            await interaction.editReply({
                embeds: [{
                    color: 0x00FF00,
                    title: '📝 Question Submitted',
                    description: 'Thank you for your submission! Your question will be reviewed by our team.',
                    fields: [
                        {
                            name: 'Question',
                            value: question
                        },
                        {
                            name: 'Correct Answer',
                            value: answer
                        },
                        {
                            name: 'Options',
                            value: `A. ${answer}\nB. ${option1}\nC. ${option2}\nD. ${option3}`
                        }
                    ],
                    footer: {
                        text: 'Formula 1 Bot',
                        icon_url: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi.png.transform/3col/image.png'
                    }
                }]
            });
        } catch (error) {
            console.error('Error in /question command:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('An error occurred while submitting your question. Please try again later.')],
                flags: 64
            });
        }
    },
}; 