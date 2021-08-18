module.exports = (client) => {
    let users = {}
    let channelIds = []

    let emoji = '👍';

    const whichRollIsHigher = (first, second) => {
        return second - first
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
        const member = await guild.members.fetch(userId)
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
            console.log("users: ", userIds);
            for(let user in userIds) {
                rolls[user] = Math.floor(Math.random() * 100) + 1 // between 1->100 inclusive
            }

            let sortedRolls = sortRolls(rolls);
            console.log("sortedRolls: ", sortedRolls);
            for(let i = 0; i < sortedRolls.length; i++) {
                let pair = sortedRolls[i];
                let nickname = await getNickname(pair[0], message.guild);
                rollsText += `${nickname} = ${pair[1]}\n`;
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