const { v4: uuid } = require('uuid');

class Rule {
    static TYPES = {
        BETTER: "better",
        BEST: "best",
        TEXT: "text",
        EQUAL: "equal",
        FLIPS: "flips",
        REROLL: "reroll"
    }

    constructor(type, numberOne, numberTwo, description) {
        this.type = type;
        this.numberOne = numberOne;
        this.numberTwo = numberTwo;
        this.description = description;
    }


    type = Rule.TYPES.TEXT;
    numberOne = 0;
    numberTwo = 0;
    description = '';

    display = () => {
        switch (this.type) {
            case Rule.TYPES.BETTER:
                return `${this.numberOne} > ${this.numberTwo}`
            case Rule.TYPES.BEST:
                return `${this.numberOne} is the greatest`
            case Rule.TYPES.TEXT:
                return this.description;
            case Rule.TYPES.EQUAL:
                return `${this.numberOne} = ${this.numberTwo}`
            case Rule.TYPES.FLIPS:
                return `${this.numberOne} flips rankings`
            case Rule.TYPES.REROLL:
                return `${this.numberOne} re-rolls`;
            default:
                return '';
        }
    }
}

const rules = {}

const getRulesForNumber = (number) => {
    return Object.values(rules).filter(rule => rule.numberOne === number || rule.numberTwo === number);
}

const descendingSort = (firstNumber, secondNumber) => {
    return firstNumber - secondNumber
}

module.exports = {
    getDescriptions: (number) => {
        return getRulesForNumber(number).filter(r => r.type === Rule.TYPES.TEXT).map(r => r.description);
    },

    flips: (number) => {
        return getRulesForNumber(number).find(r => r.type === Rule.TYPES.FLIPS) !== undefined;
    },

    getRules: (firstNumber, secondNumber) => {
        const result = []

        if(firstNumber) {
            const numberOneRules = getRulesForNumber(firstNumber);
            result.push(numberOneRules.filter(rule => rule.type === Rule.TYPES.BEST || rule.type === Rule.TYPES.TEXT ||
                rule.type === Rule.TYPES.REROLL || rule.type === Rule.TYPES.FLIPS))
        }

        if(secondNumber) {
            const numberTwoRules = getRulesForNumber(secondNumber);
            result.push(numberTwoRules.filter(rule => rule.type === Rule.TYPES.BEST || rule.type === Rule.TYPES.TEXT ||
                rule.type === Rule.TYPES.REROLL || rule.type === Rule.TYPES.FLIPS))
        }

        if(firstNumber && secondNumber) {
            result.push(Object.values(rules).filter(rule =>
                (rule.numberOne === firstNumber || rule.numberTwo === firstNumber) &&
                (rule.numberOne === secondNumber || rule.numberTwo === secondNumber)));
        }

        return result;
    },

    applyRule: (firstNumber, secondNumber, rulesObtained) => {
        let firstNumberRules = rulesObtained.filter(r => (r.numberOne === firstNumber || r.numberTwo === firstNumber) &&
            (r.numberOne === undefined || r.numberTwo === undefined));
        const numOneGreatest = firstNumberRules.find(r.type === Rule.TYPES.BEST) !== undefined;

        let secondNumberRules = rulesObtained.filter(r => !(r.numberOne === undefined || r.numberTwo === undefined) &&
            (r.numberOne === secondNumber || r.numberTwo === secondNumber));
        const numTwoGreatest = secondNumberRules.find(r.type === Rule.TYPES.BEST) !== undefined;

        let bothNumberRules = rulesObtained.filter(r => (r.numberOne === firstNumber || r.numberTwo === firstNumber) &&
            (r.numberOne === secondNumber || r.numberTwo === secondNumber));
        let betterRules = bothNumberRules.filter(r => r.type === Rule.TYPES.BETTER);
        let equalRules = bothNumberRules.filter(r => r.type === Rule.TYPES.EQUAL);

        if(numOneGreatest && numTwoGreatest && firstNumber !== secondNumber)
            return descendingSort(firstNumber, secondNumber)

        if(numOneGreatest || numTwoGreatest && firstNumber !== secondNumber && equalRules.length > 0)
            return descendingSort(firstNumber, secondNumber)

        if(numOneGreatest || numTwoGreatest && betterRules.length > 0)
            return descendingSort(firstNumber, secondNumber)

        if(numOneGreatest)
            return 1;
        if(numTwoGreatest)
            return -1;

        if(equalRules.length > 0 && betterRules.length > 0)
            return descendingSort(firstNumber, secondNumber)

        if(equalRules.length > 0)
            return 0;

        if(betterRules.length > 0) {
            let oneBetter = betterRules.find(r => r.numberOne === firstNumber) !== undefined
            let twoBetter = betterRules.find(r => r.numberOne === secondNumber) !== undefined

            if(oneBetter && twoBetter)
                return descendingSort(firstNumber, secondNumber)
            else if(oneBetter)
                return 1
            else
                return -1;
        }

        return descendingSort(firstNumber, secondNumber)
    },

    needsReroll: (number) => {
        return getRulesForNumber(number).filter(r => r.type === Rule.TYPES.REROLL).length > 0;
    },

    setup: (client) => {
        client.on('message', async (message) => {
            let {content} = message
            content = content.trim();

            const channelId = message.channel.id;
            const channel = await client.channels.fetch(channelId)
            let splitContent = content.split(' ');
            if (content.startsWith('!addRule')) {
                const newUUID = uuid();
                if(splitContent.length === 4 && splitContent[1] === 'greater') {
                    rules[newUUID] = new Rule(Rule.TYPES.BETTER, splitContent[2], splitContent[3]);
                } else if(splitContent.length === 4 && splitContent[1] === 'equals') {
                    rules[newUUID] = new Rule(Rule.TYPES.EQUAL, splitContent[2], splitContent[3]);
                } else if(splitContent.length === 3 && splitContent[1] === 'greatest') {
                    rules[newUUID] = new Rule(Rule.TYPES.BEST, splitContent[2]);
                } else if(splitContent.length > 4 && splitContent[1] === 'text') {
                    rules[newUUID] = new Rule(Rule.TYPES.TEXT, splitContent[2], undefined, splitContent[3]);
                } else if(splitContent.length === 3 && splitContent[1] === 'flip') {
                    rules[newUUID] = new Rule(Rule.TYPES.FLIPS, splitContent[2]);
                } else if(splitContent.length === 3 && splitContent[1] === 'reroll') {
                    rules[newUUID] = new Rule(Rule.TYPES.REROLL, splitContent[2]);
                } else {
                    channel.send('Invalid syntax.\n!addRule greater number number\n!addRule equals number number\n!addRule greatest number\n'+
                        +'!addRule flip number\n!addRule reroll number\n!addRule text number DESCRIPTION');
                    return;
                }
                channel.send(`Rule added. (ID = ${newUUID})`);
            }
            else if (content.startsWith('!removeRules') && splitContent.length === 2) {
                let filtered = Object.keys(rules).map(key => [key, rules[key]]).filter(pair => pair[1].numberOne === splitContent[1] || pair[1].numberTwo === splitContent[1]) || [];

                if(filtered.length > 0) {
                    for(let i = 0; i < filtered.length; i++) {
                        delete rules[filtered[i][0]]
                    }
                    channel.send('All rules removed.');
                } else {
                    channel.send('No rules found.');
                }
            }
            else if (content.startsWith('!removeRuleById') && splitContent.length === 2) {
                let id = splitContent[1];
                if(rules[id]) {
                    delete rules[id];
                    channel.send('Rule removed.');
                } else {
                    channel.send('Rule not found.');
                }
            }
            else if(splitContent.length === 2 && splitContent[0] === '!checkRule') {
                let filtered = getRulesForNumber(splitContent[1]);
                if(filtered.length > 0) {
                    let text = filtered.length === 1 ? '' : 'The rules found are:\n';
                    let length = filtered.length;
                    for(let i = 0; i < length; i++) {
                        text += filtered[i].display() + (i === length - 1 ? '' : '\n');
                    }
                    channel.send(text);
                } else {
                    channel.send('No rules found.');
                }
            }
            else if(splitContent.length === 2 && splitContent[0] === '!checkRuleById') {
                let id = splitContent[1];
                if(rules[id]) {
                    channel.send(rules[id].display());
                } else {
                    channel.send('Rule not found.');
                }
            }
        });
    }
}