const {getRules, applyRule, setup} = require('./rules')

module.exports = (client) => {
    setup(client);

    let users = {}
    let channelIds = []

    let emoji = '👍';

    const whichRollIsHigher = (first, second) => {
        let rules = getRules(first,second);
        if(rules.length === 0)
            return first - second; // sort descending
        else
            return applyRule(first, second);
    }

    const sortRolls = (rolls) => {
        // Create items array
        let items = Object.keys(rolls).map(function(key) {
            return [key, rolls[key]];
        });

        // Sort the array based on the second element
        items.sort(function(first, second) {
            return whichRollIsHigher(first[1], second[1]);
        });

        return items;
    }

    const getNickname = async (userId, guild) => {
        const member = guild.members.cache.get(userId) || await guild.members.fetch(userId)
        if(member)
            return member.nickname || member.displayName;
        else
            return userId;
    }

    client.on('message', async (message) => {
        const { content } = message

        const channelId = message.channel.id;
        const channel = await client.channels.fetch(channelId)
        if (content === '!setupRoll') {
            if(channelIds.includes(channelId)) {
                channel.send('A roll is already in progress! Please type !completeRoll to end the roll.');
            }
            else {
                channel.send('Add a reaction to join the queue then type !completeRoll').then((message) => {
                    channelIds.push(channelId)
                    users[channelId] = []
                    message.react(emoji)
                })
            }
        }
        else if(content === '!completeRoll') {
            let rollsText = 'The final roll results are:\n\n'
            let rolls = {}
            let userIds = users[channelId] || [];
            for(let i = 0; i < userIds.length; i++) {
                let user = userIds[i]
                rolls[user] = Math.floor(Math.random() * 100) + 1 // between 1->100 inclusive
            }

            let sortedRolls = sortRolls(rolls);
            for(let i = 0; i < sortedRolls.length; i++) {
                let pair = sortedRolls[i];
                let nickname = await getNickname(pair[0], message.guild);
                rollsText += `${i} - ${nickname} = ${pair[1]}\n`;
            }

            channel.send(rollsText);

            channelIds = channelIds.filter(c => c !== channelId)
            delete users[channelId]
        }
    })

    const handleReaction = (reaction, user, add, channelId) => {
        if (user.id === '877352185409724486') {
            return
        }

        const emojiTemp = reaction._emoji.name
        if (emojiTemp === emoji) {
            if (add) {
                users[channelId].push(user.id)
            } else {
                users[channelId] = users[channelId].filter(u => u !== user.id);
            }
        }
    }

    client.on('messageReactionAdd', (reaction, user) => {
        let channelId = reaction.message.channel.id;
        if (channelIds.includes(channelId)) {
            handleReaction(reaction, user, true, channelId)
        }
    })

    client.on('messageReactionRemove', (reaction, user) => {
        let channelId = reaction.message.channel.id;
        if (channelIds.includes(channelId)) {
            handleReaction(reaction, user, false, channelId)
        }
    })
}