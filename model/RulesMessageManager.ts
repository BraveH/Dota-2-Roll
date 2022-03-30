import {Rules} from "./Rules";
import {Rule} from "./Rule";
import {RulesEngine} from "./RulesEngine";
import {MessageUtils} from "./MessageUtils";
const { v4: uuid } = require('uuid');

export class RulesMessageManager {

    static async handleRulesCRUD(message: any, content: string, client: any) {
        const channelId = message.channel.id;
        const channel = await client.channels.fetch(channelId)
        let splitContent = content.split(' ');
        if (content.startsWith('!addRule')) {
            const newUUID = uuid();
            if (splitContent.length === 4 && splitContent[1] === 'greater') {
                await Rules.sharedInstance().addRule(newUUID, Rule.TYPES.BETTER, Number.parseInt(splitContent[2]), Number.parseInt(splitContent[3]))
            } else if (splitContent.length === 4 && splitContent[1] === 'equals') {
                await Rules.sharedInstance().addRule(newUUID, Rule.TYPES.EQUAL, Number.parseInt(splitContent[2]), Number.parseInt(splitContent[3]))
            } else if (splitContent.length === 3 && splitContent[1] === 'greatest') {
                await Rules.sharedInstance().addRule(newUUID, Rule.TYPES.BEST, Number.parseInt(splitContent[2]))
            } else if (splitContent.length > 4 && splitContent[1] === 'text') {
                await Rules.sharedInstance().addRule(newUUID, Rule.TYPES.TEXT, Number.parseInt(splitContent[2]), undefined, splitContent.slice(3).join(' '))
            } else if (splitContent.length === 3 && splitContent[1] === 'flip') {
                await Rules.sharedInstance().addRule(newUUID, Rule.TYPES.FLIPS, Number.parseInt(splitContent[2]))
            } else if (splitContent.length === 3 && splitContent[1] === 'reroll') {
                await Rules.sharedInstance().addRule(newUUID, Rule.TYPES.REROLL, Number.parseInt(splitContent[2]))
            } else if (splitContent.length === 4 && splitContent[1] === 'value') {
                await Rules.sharedInstance().addRule(newUUID, Rule.TYPES.VALUE, Number.parseInt(splitContent[2]), Number.parseInt(splitContent[3]))
            } else {
                channel.send('Invalid syntax.\n\`!addRule greater number number\`\n\`!addRule equals number number\`\n\`!addRule greatest number\`\n\`!addRule flip number\`\n\`!addRule reroll number\`\n\`!addRule text number DESCRIPTION\`\n\`!addRule value number number\`');
                return;
            }
            channel.send(`Rule added. (ID = ${newUUID})`);
        } else if (content.startsWith('!removeRules') && splitContent.length === 2) {
            let rulesSharedInst = Rules.sharedInstance();
            let rules = rulesSharedInst.allRules;
            let filtered = Object.keys(rules).map(key => [key, rules[key]]).filter(pair => {
                return (pair[1] as Rule).numberOne == Number.parseInt(splitContent[1]) || (pair[1] as Rule).numberTwo == Number.parseInt(splitContent[1])
            }) || [];

            if (filtered.length > 0) {
                rulesSharedInst.deleteRules(filtered.map(pair => pair[0] as string)).then(_ => {
                    channel.send('All rules removed.');
                })
            } else {
                channel.send('No rules found.');
            }
        } else if (content.startsWith('!removeRuleById') && splitContent.length === 2) {
            let rulesSharedInst = Rules.sharedInstance();
            let rules = rulesSharedInst.allRules;
            let id = splitContent[1];
            if (rules[id]) {
                rulesSharedInst.deleteRules([id]).then(_ => {
                    channel.send('Rule removed.');
                })
            } else {
                channel.send('Rule not found.');
            }
        } else if (splitContent.length === 2 && splitContent[0] === '!checkRule') {
            let filtered = RulesEngine.sharedInstance().getRulesForNumber(Number.parseInt(splitContent[1]), channelId, true);
            if (filtered.length > 0) {
                let text = filtered.length === 1 ? '' : 'The rules found are:\n';
                let length = filtered.length;
                for (let i = 0; i < length; i++) {
                    text += filtered[i].display() + (i === length - 1 ? '' : '\n');
                }
                channel.send(text);
            } else {
                channel.send('No rules found.');
            }
        } else if (splitContent.length === 2 && splitContent[0] === '!checkRuleById') {
            let rules = Rules.allRules();
            let id = splitContent[1];
            if (rules[id]) {
                channel.send(rules[id].display());
            } else {
                channel.send('Rule not found.');
            }
        } else if (content === '!listRules') {
            let rules = Rules.allRules();
            let keys = Object.keys(rules);
            keys.sort((k1:string, k2:string) => {
                let firstNumber = rules[k1].numberOne || 0;
                let secondNumber = rules[k2].numberOne || 0;
                return firstNumber - secondNumber
            })
            let keysLength = keys.length;
            let texts = [keysLength === 0 ? 'There are no rules set!' : keysLength === 1 ? 'The only rule is:\n' : 'The rules are:\n'];
            let j = 0
            let length = keysLength;
            for (let i = 0; i < length; i++) {
                let id = keys[i];
                let text = `${rules[id].display()}\t\`[ID = ${id}]\`` + (i === length - 1 ? '' : '\n');

                let currentText = texts[j]
                if (currentText.length + text.length > 2000) {
                    j++
                    texts.push('');
                }

                texts[j] += text;
            }
            MessageUtils.sendMessages(channel, texts, 0);
        }
    }
}