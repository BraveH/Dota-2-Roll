const Discord = require('discord.js')
const client = new Discord.Client()
const rollLogic = require('./roll-logic')

client.on('ready', () => {
  console.log('The client is ready!')

  rollLogic(client)
})

client.login(process.env.DISCORD_TOKEN)
