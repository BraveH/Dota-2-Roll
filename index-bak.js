const Discord = require('discord.js')
const client = new Discord.Client()
const rollLogic = require('./roll-logic')
const { Client } = require('pg');

const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
    .use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .get('/', (req, res) => res.render('pages/index'))
    .listen(PORT, () => console.log(`Listening on ${ PORT }`))

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

dbClient.connect();

client.on('ready', () => {
  console.log('The client is ready!')
  client.on('message', async (message) => {
    const {content} = message

    const channelId = message.channel.id;
    const channel = await client.channels.fetch(channelId)
    if (content === '!dotabot') {
      channel.send(
          'Dota 2 Roll Bot Help\n\n' +
          'Rolling:\n' +
          '\t\`!setupRoll\`\n' +
          '\t\`!completeRoll\`\n\n' +

          'Add Rules:\n' +
          '\t\`!addRule greater numberOne numberTwo\`\n' +
          '\t\`!addRule equals numberOne numberTwo\`\n' +
          '\t\`!addRule greatest number\`\n' +
          '\t\`!addRule flip number\`\n' +
          '\t\`!addRule reroll number\`\n' +
          '\t\`!addRule text number description\`\n' +
          '\t\`!addRule value number number\`\n\n' +

          'Remove Rules:\n' +
          '\t\`!removeRules number\`\n' +
          '\t\`!removeRuleById ID\`\n\n' +

          'Check Rules:\n' +
          '\t\`!checkRule number\`\n' +
          '\t\`!checkRuleById ID\`\n\n' +

          'List Rules:\n' +
          '\t\`!listRules\`'
      );
    }
  })

  rollLogic(client, dbClient)
})

client.login(process.env.DISCORD_TOKEN)
