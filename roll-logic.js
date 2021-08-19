const {getRules, applyRule, setup, flips, getDescriptions, needsReroll} = require('./rules')

module.exports = (client, dbClient) => {
    setup(client, dbClient);

    let users = {}
    let rulesUsed = {}
    let channelIds = []
    let messageInChannel = {}

    let emoji = '👍';
    let stopEmoji = '🛑';
    let refreshEmoji = '♻';
    const BOTID = '877352185409724486';

    const whichRollIsHigher = (first, second, channelId) => {
        let rules = getRules(first,second);
        if(rules.length === 0)
            return second - first; // sort descending
        else {
            let [sortResult, ruleUsed] = applyRule(first, second, rules);

            if(ruleUsed) {
                rulesUsed[channelId] = [...(rulesUsed[channelId] || []), ruleUsed];
            }

            return sortResult;
        }
    }

    const sortRolls = (rolls, channelId) => {
        // Create items array
        let items = Object.keys(rolls).map(function(key) {
            return [key, rolls[key]];
        });

        // Sort the array based on the second element
        items.sort(function(first, second) {
            return whichRollIsHigher(first[1], second[1], channelId);
        });

        let flipCount = 0;
        for(let i = 0; i < items.length; i++) {
            if(flips(items[i][1]))
                flipCount += 1;
        }

        return [items, flipCount];
    }

    const getNickname = async (userId, guild) => {
        const member = guild.members.cache.get(userId) || await guild.members.fetch(userId)
        if(member)
            return member.nickname || member.displayName;
        else
            return userId;
    }

    const startRoll = async (channel, channelId) => {
        return channel.send('Add a reaction to join the queue then type \`!completeRoll\` or press the 🛑 emoji.').then((message) => {
            channelIds.push(channelId)
            messageInChannel[channelId] = message.id;
            users[channelId] = []
            message.react(emoji).then(_ => {
                message.react(stopEmoji)
            })
        })
    }

    const completeRoll = async (channelId, guild, channel) => {
        let rollsText = 'The final roll results are:\n\n'
        let rolls = {}
        let userIds = users[channelId] || [];
        for(let i = 0; i < userIds.length; i++) {
            let user = userIds[i]
            let roll;
            while(true) {
                roll = Math.floor(Math.random() * 100) + 1; //50;
                if(!needsReroll(roll))
                    break;
            }
            rolls[user] = roll // between 1->100 inclusive
        }

        let [sortedRolls, flipCount] = sortRolls(rolls, channelId);
        let length = sortedRolls.length;
        for(let i = 0; i < length; i++) {
            let pair;
            if(flipCount % 2 === 0)
                pair = sortedRolls[i];
            else
                pair = sortedRolls[length - 1 - i];
            let nickname = await getNickname(pair[0], guild);

            let roll = pair[1];
            let descriptions = getDescriptions(roll);
            rollsText += `${i+1} - ${nickname} = ${roll}${descriptions.length > 0 ? ' | ' + descriptions.join(', ') : ''}` + (i === length - 1 ? '' : '\n');
        }
        if(flipCount > 0)
            rollsText += `\n\nTable flipped ${flipCount} time${flipCount > 1 ? 's' : ''}`
        if(rulesUsed[channelId]) {
            let r = rulesUsed[channelId]
            let rulesUsedLength = r.length;
            rollsText += `\n\nRule${rulesUsedLength > 1 ? 's' : ''} Used:\n`
            for(let i = 0; i < rulesUsedLength; i++) {
                rollsText += `${r[i]}` + (i === rulesUsedLength - 1 ? '' : '\n');
            }
            delete rulesUsed[channelId];
        }

        channel.send(rollsText).then(message => {
            channelIds = channelIds.filter(c => c !== channelId)
            delete users[channelId]
            delete messageInChannel[channelId]

            message.react(refreshEmoji);
        });
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
                await startRoll(channel, channelId);
            }
        }
        else if(content === '!completeRoll') {
            await completeRoll(channelId, message.guild, channel);
        }
    })

    const handleReaction = async (reaction, user, add, channelId) => {
        if (user.id === BOTID) {
            return
        }

        const emojiTemp = reaction._emoji.name
        let message = reaction.message;
        console.log(emojiTemp, message.author.id, channelIds.includes(channelId));
        if(messageInChannel[channelId] && message.id === messageInChannel[channelId]) {
            if (emojiTemp === emoji) {
                if (add) {
                    users[channelId].push(user.id)
                } else {
                    users[channelId] = users[channelId].filter(u => u !== user.id);
                }
            } else if (emojiTemp === stopEmoji) {
                const channel = await client.channels.fetch(channelId);
                await completeRoll(channelId, message.guild, channel);
            }
        } else if (emojiTemp === refreshEmoji && message.author.id === BOTID && !channelIds.includes(channelId)) {
            const channel = await client.channels.fetch(channelId);
            await startRoll(channel, channelId);
        }
    }

    client.on('messageReactionAdd', async (reaction, user) => {
        let channelId = reaction.message.channel.id;
        if (channelIds.includes(channelId)) {
            await handleReaction(reaction, user, true, channelId)
        }
    })

    client.on('messageReactionRemove', async (reaction, user) => {
        let channelId = reaction.message.channel.id;
        if (channelIds.includes(channelId)) {
            await handleReaction(reaction, user, false, channelId)
        }
    })
}