import {Rules} from "./model/Rules";
import {RulesMessageManager} from "./model/RulesMessageManager";
import {RulesFlow} from "./model/RulesFlow";

const Discord = require('discord.js')
const client = new Discord.Client()

const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
    .use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .get('/', (req: any, res: { render: (arg0: string) => any; }) => res.render('pages/index'))
    .listen(PORT, () => console.log(`Listening on ${ PORT }`))

client.login(process.env.DISCORD_TOKEN).then((_: any) => {
    client.on('ready', () => {
        console.log('The client is ready!')
        client.on('message', async (message: { channel?: any; content?: any; }) => {
            const {content} = message

            const channelId = message.channel.id;
            const channel = await client.channels.fetch(channelId)
            if (content === '!dotabot') {
                channel.send(
                    'Dota 2 Roll Bot Help\n\n' +
                    'Rolling:\n' +
                    '\t\`!roll <game>\`\n' +
                    '\t\`!setupRoll <game>\`\n' +
                    '\t\`!completeRoll\`\n\n' +

                    'Add Rules:\n' +
                    '\t\`!addRule greater numberOne numberTwo\`\n' +
                    '\t\`!addRule equals numberOne numberTwo\`\n' +
                    '\t\`!addRule greatest number\`\n' +
                    '\t\`!addRule flip number\`\n' +
                    '\t\`!addRule reroll number\`\n' +
                    '\t\`!addRule text number DESCRIPTION\`\n' +
                    '\t\`!addRule text number game DESCRIPTION\`\n' +
                    '\t\`!addRule value number number\`\n' +
                    '\t\`!addRule swap number [[swap1, swap2],[swap1, swap2]]\`\n\n' +

                    'Remove Rules:\n' +
                    '\t\`!removeRules number\`\n' +
                    '\t\`!removeRuleById ID\`\n\n' +

                    'Check Rules:\n' +
                    '\t\`!checkRule number\`\n' +
                    '\t\`!checkRuleById ID\`\n\n' +

                    'List Rules:\n' +
                    '\t\`!listRules\`\n' +
                    '\t\`!rules\`'
                );
            }
        })
    })

    client.on('message', async (message: { content: any; }) => {
        let {content} = message
        content = content.trim();

        await RulesMessageManager.handleRulesCRUD(message, content, client);
    });

    Rules.sharedInstance();
    RulesFlow.sharedInstance(client).start();
})