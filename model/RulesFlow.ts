import {Roller} from "./Roller";
import {Rule} from "./Rule";
import {RulesEngine} from "./RulesEngine";
import {Rules} from "./Rules";
import {MessageUtils} from "./MessageUtils";
const { v4: uuid } = require('uuid');

const emoji = '👍';
const stopEmojiName = 'completeroll'//'🛑';
const stopEmojiText = `:${stopEmojiName}:`//'🛑';
const stopEmoji = `<${stopEmojiText}890010711428837466>`//'🛑';
const cancelEmoji = '❌';
const refreshEmoji = '🎲';
const BOTID = '877352185409724486';

export class RulesFlow {

    users : { [channelId:string]:Roller[] } = {}
    channelIds : string[] = []
    messageInChannel : { [channelId:string]:string } = {}
    client

    constructor(client: any) {
        this.client = client;
    }

    private static INSTANCE : RulesFlow
    static sharedInstance(client = undefined) {
        if(!RulesFlow.INSTANCE)
            RulesFlow.INSTANCE = new RulesFlow(client)

        return RulesFlow.INSTANCE;
    }

    private removeDuplicateRules(rules: Rule[]) {
        return rules.filter((value, index, self) =>
            index === self.findIndex((t) => (
                t.id === value.id
            ))
        )
    }

    start() {
        this.client.on('message', async (message: any) => {
            let { content } = message
            content = content.trim();

            const channelId = message.channel.id;
            const channel = await this.client.channels.fetch(channelId)
            if (content === '!setupRoll' ||  content === `!roll`) {
                if(this.channelIds.includes(channelId)) {
                    channel.send('A roll is already in progress! Please type \`!completeRoll\` to end the roll.');
                }
                else {
                    await this.startRoll(channel, channelId);
                }
            }
            else if(content === '!completeRoll') {
                if(this.channelIds.includes(channelId)) {
                    await this.completeRoll(channelId, message.guild, channel);
                } else {
                    channel.send('There is no roll in progress. Type \`!setupRoll\` or \`!roll\` to start a new roll.');
                }
            }
            else if(content.startsWith('!testSort')) {
                let rolls = content.split(' ').slice(1);
                let testChannel = 'testChannel';
                const rollers : Roller[] = rolls.map((roll: string)=>new Roller("roll"+roll, testChannel, "roll"+roll+uuid(), Number.parseInt(roll)));
                let [sortedRolls, flipCount] = this.sortRolls(rollers);
                const rulesUsed = this.removeDuplicateRules(rollers.reduce((acc:Rule[], roller) => [...acc, ...roller.rules], [])
                ).map(r=>r.display())
                channel.send(`\`sortedRolls = ${(sortedRolls as Roller[]).map(r => r.roll).join(',')}\` & flipCount = ${flipCount} & rulesUsed = \n${rulesUsed.join('\n')}`);
            }
        })

        this.client.on('messageReactionAdd', async (reaction:any, user:any) => {
            let channelId = reaction.message.channel.id;
            await this.handleReaction(reaction, user, true, channelId)
        })

        this.client.on('messageReactionRemove', async (reaction:any, user:any) => {
            let channelId = reaction.message.channel.id;
            await this.handleReaction(reaction, user, false, channelId)
        })
    }

    async handleReaction (reaction:any, user:any, add:boolean, channelId: string) {
        let userId : string = user.id;
        if (userId === BOTID) {
            return
        }

        const emojiTemp = reaction._emoji.name
        let message = reaction.message;
        let containsChannel = this.channelIds.includes(channelId);
        let id = message.id;
        if(containsChannel && this.messageInChannel[channelId] && id === this.messageInChannel[channelId]) {
            if (emojiTemp === emoji) {
                if (add) {
                    this.users[channelId].push(new Roller(await this.getNickname(userId, message.guild), channelId, userId))
                } else {
                    this.users[channelId] = this.users[channelId].filter(u => u.id !== userId);
                }
            } else if (emojiTemp === stopEmojiName) {
                const channel = await this.client.channels.fetch(channelId);
                await this.completeRoll(channelId, message.guild, channel);
            } else if (emojiTemp === cancelEmoji) {
                this.channelIds = this.channelIds.filter(c => c !== channelId)
                delete this.users[channelId]
                delete this.messageInChannel[channelId]
                const channel = await this.client.channels.fetch(channelId);
                channel.send(`Queue has been cancelled. Type \`!setupRoll\` or \`!roll\` or press the ${refreshEmoji} emoji to start a new queue.`).then((message:any) => {
                    message.react(refreshEmoji);
                });
            }
        } else if (emojiTemp === refreshEmoji && message.author.id === BOTID && !containsChannel) {
            const channel = await this.client.channels.fetch(channelId);
            await this.startRoll(channel, channelId);
        }
    }

    private pairwiseWeightUsers(users:Roller[]) {
        for(let i=0; i < users.length; i++) {
            const user1 = users[i]
            user1.weight = 0;
            user1.equalRollers = []
            user1.betterThanRollers = []

            const roll1 = user1.roll;
            let rollToAddToWeight = roll1;
            const isBest = Object.values(Rules.allRules()).find(rule =>
                (rule.numberOne == roll1 || rule.numberTwo == roll1) &&
                rule.type === Rule.TYPES.BEST
            )
            if(isBest !== undefined) {
                user1.weight += 1000;
                user1.rules.push(isBest);
            }

            for(let j=0; j < users.length; j++) {
                if(i == j)
                    continue;

                const user2 = users[j]
                const roll2 = user2.roll;
                const rules = Object.values(Rules.allRules()).filter(rule =>
                    (rule.numberOne == roll1 || rule.numberTwo == roll1) &&
                    (rule.numberOne == roll2 || rule.numberTwo == roll2)
                )
                const isRoll1BetterThan2 = rules.find(r => r.type === Rule.TYPES.BETTER && r.numberOne === roll1 && r.numberTwo === roll2);
                if(isRoll1BetterThan2 !== undefined) {
                    user1.betterThanRollers.push(user2);
                    user1.rules.push(isRoll1BetterThan2);
                }

                const isEqual = rules.find(r => r.type === Rule.TYPES.EQUAL);
                if(isEqual !== undefined) {
                    user1.equalRollers.push(user2);
                    user1.rules.push(isEqual);
                }

                const isValue = rules.find(r => r.type === Rule.TYPES.VALUE);
                if(isValue !== undefined) {
                    rollToAddToWeight = Math.max(rollToAddToWeight, roll2);
                    user1.rules.push(isValue);
                }
            }
            user1.weight += rollToAddToWeight;
        }

        for(let i=0; i < users.length; i++) {
            const user1 = users[i]
            user1.setMaxEqualWeight();
        }

        // If rolls keep changing more than 10 times in a row that probably is due to a cyclic dependency
        // so just prevent stack overflow
        const maxLoops = 10
        let loopCount = 0
        while(loopCount < maxLoops) {
            let rollsChanged = false;
            for (let i = 0; i < users.length; i++) {
                const user1 = users[i]
                const userWeight = user1.weight;
                user1.setMaxGreaterThanWeight();
                if(user1.weight !== userWeight)
                    rollsChanged = true;
            }
            if(!rollsChanged)
                break;
            else
                loopCount++;
        }
    }

    sortRolls(users:Roller[]) {
        let rulesEngine = RulesEngine.sharedInstance();

        // Sort the array based on the second element
        // const self = this
        // users.sort(function(first, second) {
        //     return self.whichRollIsHigher(first.roll, second.roll, channelId);
        // });
        this.pairwiseWeightUsers(users);
        users.sort((u1,u2) => u2.weight - u1.weight)

        let flipCount = 0;
        const swapRules = [];
        for(let i = 0; i < users.length; i++) {
            let user = users[i]
            let shouldNumberFlipRule = rulesEngine.doesNumberFlip(user.roll);
            if(shouldNumberFlipRule !== undefined) {
                user.rules.push(shouldNumberFlipRule);
                flipCount += 1;
            }

            let shouldNumberSwapRule = rulesEngine.doesNumberSwap(user.roll);
            if(shouldNumberSwapRule !== undefined) {
                user.rules.push(shouldNumberSwapRule);
                swapRules.push(shouldNumberSwapRule);
            }
        }

        const usersLength = users.length;
        for(let i = 0; i < swapRules.length; i++) {
            const swaps : [[number,number]]|undefined = swapRules[i].getSwapsArray();
            if(swaps) {
                swaps.forEach(([swap1, swap2]) => {
                    const index1 : number = swap1 < 0 ? usersLength + swap1 : (swap1 === 0 ? 0 : swap1 - 1);
                    const index2 : number = swap2 < 0 ? usersLength + swap2 : (swap2 === 0 ? 0 : swap2 - 1);
                    [users[index1], users[index2]] = [users[index2], users[index1]];
                })
            }
        }

        return [users, flipCount];
    }

    async getNickname (userId: string, guild: any) {
        const member = guild.members.cache.get(userId) || await guild.members.fetch(userId)
        if(member)
            return member.nickname || member.displayName;
        else
            return userId;
    }

    async startRoll(channel: any, channelId: string) {
        this.channelIds.push(channelId);
        return channel.send(`Add a reaction to join the queue then type \`!completeRoll\` or press the ${stopEmojiText} emoji.\nYou can also press the ${cancelEmoji} emoji to cancel the queue.`).then((message:any) => {
            this.messageInChannel[channelId] = message.id;
            this.users[channelId] = []
            message.react(emoji).then((_: any) => {
                message.react(stopEmoji).then((_: any) => {
                    message.react(cancelEmoji);
                })
            })
        })
    }

    async completeRoll(channelId: string, guild: any, channel: any) {
        let rulesEngine = RulesEngine.sharedInstance();
        this.channelIds = this.channelIds.filter(c => c !== channelId)
        let rollsText = 'The final roll results are:\n\n'
        let users = this.users[channelId] || [];
        for(let i = 0; i < users.length; i++) {
            let user = users[i]
            while(true) {
                let shouldNumberReRollRule = rulesEngine.shouldNumberReRoll(user.roll);
                if(shouldNumberReRollRule === undefined)
                    break;

                user.rules.push(shouldNumberReRollRule);
                user.reRoll();
            }
        }

        let [sortedRolls, flipCount] = this.sortRolls(users);
        const rollers = sortedRolls as Roller[];
        let length = rollers.length;

        for(let i = 0; i < length; i++) {
            let user;
            if((flipCount as number) % 2 === 0)
                user = rollers[i];
            else
                user = rollers[length - 1 - i];
            let nickname = user.name //await getNickname(pair[0], guild);

            let roll = user.roll;
            let descriptions = rulesEngine.getDescriptionRules(roll);
            rollsText += `${i+1} - \`${nickname}\` = \`${roll}\`${descriptions.length > 0 ? ' | \`' + descriptions.join('\`, \`') + '\`' : ''}` + (i === length - 1 ? '' : '\n');
        }
        if(flipCount > 0)
            rollsText += `\n\nTable flipped ${flipCount} time${flipCount > 1 ? 's' : ''}`

        const rulesUsed = this.removeDuplicateRules(rollers.reduce((acc:Rule[], roller) => [...acc, ...roller.rules], [])
        ).map(r=>r.display())

        if(rulesUsed && rulesUsed.length > 0) {
            let rulesUsedLength = rulesUsed.length;
            rollsText += `\n\nRule${rulesUsedLength > 1 ? 's' : ''} Used:\n`
            for(let i = 0; i < rulesUsedLength; i++) {
                rollsText += `\`${rulesUsed[i]}\`` + (i === rulesUsedLength - 1 ? '' : '\n');
            }
        }

        MessageUtils.sendMessagesUnsplit(channel, rollsText).then((message: any) => {
            delete this.users[channelId]
            delete this.messageInChannel[channelId]

            message.react(refreshEmoji);
        });
    }
}