const { v4: uuid } = require('uuid');

const INSERT_SQL = 'INSERT INTO RULES(id, type, numberone, numbertwo, description) VALUES($1, $2, $3, $4, $5)';
const DELETE_SQL = 'DELETE FROM RULES WHERE id = ANY($1::varchar[])';
const SELECT_SQL = 'SELECT * FROM RULES';
let db = undefined;

class Rule {
    static TYPES = {
        BETTER: "better",
        BEST: "best",
        TEXT: "text",
        EQUAL: "equal",
        FLIPS: "flips",
        REROLL: "reroll",
        VALUE: "value"
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
                return `${this.numberOne} > ${this.numberTwo}`;
            case Rule.TYPES.BEST:
                return `${this.numberOne} is the greatest`;
            case Rule.TYPES.TEXT:
                return `${this.numberOne}: ${this.description}`;
            case Rule.TYPES.EQUAL:
                return `${this.numberOne} = ${this.numberTwo}`;
            case Rule.TYPES.FLIPS:
                return `${this.numberOne} flips rankings`;
            case Rule.TYPES.REROLL:
                return `${this.numberOne} re-rolls`;
            case Rule.TYPES.VALUE:
                return `${this.numberOne} has the same value as ${this.numberTwo}`;
            default:
                return `[${this.type}], [${this.numberOne}], [${this.numberTwo}], [${this.description}]`;
        }
    }
}

const rules = {}

const getOtherNumber = (rule, number) => {
    if(rule.numberOne == number)
        return rule.numberTwo;
    else if(rule.numberTwo == number)
        return rule.numberOne;
    else return undefined;
}

const duplicateButReplacingNumber = (rule, originalNumber, newNumber) => {
    let result;
    if(rule === undefined || (rule.numberOne != originalNumber && rule.numberTwo != originalNumber)) {
        result = undefined;
    }
    else if(this.numberOne == originalNumber) {
        result = new Rule(rule.type, newNumber, rule.numberTwo, rule.description);
    } else {
        result = new Rule(rule.type, rule.numberOne, newNumber, rule.description);
    }
    return result;
}

const getValueRulesForNum = (numberOne) => {
    return Object.values(rules).filter(
        rule => (rule.numberOne == numberOne || rule.numberTwo == numberOne)
            && rule.type === Rule.TYPES.VALUE
    )
}

const getValueRulesOnly = (numberOne, numberTwo) => {
    return Object.values(rules).filter(
        rule => (rule.numberOne == numberOne || rule.numberTwo == numberOne)
        && (rule.numberOne == numberTwo || rule.numberTwo == numberTwo)
        && rule.type === Rule.TYPES.VALUE
    )
}

const getValueRules = (number, equatedValues) =>{
    let tempEquatedValues = equatedValues;
    let valueRules = Object.values(rules).filter(rule => {
        let otherNumber = getOtherNumber(rule, number);
        return rule.type === Rule.TYPES.VALUE &&
            (rule.numberOne == number || rule.numberTwo == number) &&
            otherNumber !== undefined &&
            tempEquatedValues.filter(v => v == otherNumber).length < 1
    })
    .map(rule => {
        if(!rule)
            return [];

        let otherNumber = getOtherNumber(rule, number);

        if(tempEquatedValues.filter(v => v == otherNumber).length > 0)
            return [];

        let [rulesForNumber, newEquatedValues] = getRulesForNumber2(otherNumber, [...tempEquatedValues, otherNumber]);
        tempEquatedValues = newEquatedValues;

        return rulesForNumber
            .map(ruleForOtherNumber => duplicateButReplacingNumber(ruleForOtherNumber, otherNumber, number));
        }
    ).reduce((acc, arr) => [...acc, ...(arr || [])], []);
    return [valueRules, tempEquatedValues];
}

const getRulesForNumber2 = (number, equatedValues) => {
    let [valueRules, newEquatedValues] = getValueRules(number, equatedValues || [number]);
    let numberRules = Object.values(rules).filter(rule => rule.numberOne == number || rule.numberTwo == number);
    return [[
        ...numberRules,
        ...valueRules
    ], newEquatedValues];

}

const rulesCache = {};
const getRulesForNumber = (number, channelId, includeEquates = false) => {
    let cache = rulesCache[channelId] || {};
    if(cache[number]) {
        return cache[number].filter(r => includeEquates ? true : r.type === Rule.TYPES.EQUAL);
    }

    let rulesForNumber = getRulesForNumber2(number, [number])[0];
    console.log("RULES:",number,rulesForNumber);
    cache[number] = rulesForNumber;
    rulesCache[channelId] = cache;
    return rulesForNumber.filter(r => includeEquates ? true : r.type === Rule.TYPES.EQUAL);
}

const descendingSort = (firstNumber, secondNumber) => {
    return secondNumber - firstNumber
}

const addRule = (id, type, numberOne, numberTwo, description) => {
    const rule = new Rule(type, numberOne, numberTwo, description);
    return db.query(INSERT_SQL, [id, type, numberOne, numberTwo, description]).then(res => {
        return Promise.resolve(rule);
    }).catch(e => {
        console.error(e);
        return Promise.resolve(rule)
    })
}

const deleteRules = (ruleIds) => {
    return db.query(DELETE_SQL, [ruleIds]).then(r => {
        return Promise.resolve();
    }).catch(e => {
        console.error(e);
        return Promise.resolve();
    })
}

const loadRules = () => {
    db.query(SELECT_SQL).then(res => {
        if(res && res.rows) {
            for(let i = 0; i < res.rows.length; i++) {
                let row = res.rows[i];
                rules[row.id] = new Rule(row.type, row.numberone, row.numbertwo, row.description);
            }
        }
    }).catch(e => {
        console.error(e);
    })
}

module.exports = {
    clearCache: (channelId) => {
        delete rulesCache[channelId];
        rulesCache[channelId] = {};
    },
    findInvalidGreaterRule: (filteredRules) => {
        // any greater than rule that has same number on both sides
        return filteredRules
            .find(r => r.type === Rule.TYPES.BETTER && r.numberOne == r.numberTwo && r.numberOne !== undefined) !== undefined
    },

    getDescriptions: (number, channelId) => {
        return getRulesForNumber(number, channelId).filter(r => r.type === Rule.TYPES.TEXT).map(r => r.description);
    },

    flips: (number, channelId) => {
        let rulesForNumber = getRulesForNumber(number, channelId);
        return rulesForNumber.find(r => r.type === Rule.TYPES.FLIPS) !== undefined;
    },

    getRules: (firstNumber, secondNumber, channelId) => {
        let result = []

        if(firstNumber) {
            const numberOneRules = getRulesForNumber(firstNumber, channelId);
            result = [...numberOneRules.filter(rule => rule.type === Rule.TYPES.BEST || rule.type === Rule.TYPES.TEXT ||
                rule.type === Rule.TYPES.REROLL || rule.type === Rule.TYPES.FLIPS)];
        }

        if(secondNumber) {
            const numberTwoRules = getRulesForNumber(secondNumber, channelId);
            result = [...result, ...numberTwoRules.filter(rule => rule.type === Rule.TYPES.BEST || rule.type === Rule.TYPES.TEXT ||
                rule.type === Rule.TYPES.REROLL || rule.type === Rule.TYPES.FLIPS)];
        }

        if(firstNumber && secondNumber) {
            result = [...result, ...Object.values(rules).filter(rule =>
                (rule.numberOne == firstNumber || rule.numberTwo == firstNumber) &&
                (rule.numberOne == secondNumber || rule.numberTwo == secondNumber) &&
                rule.type !== Rule.TYPES.VALUE
            )];
        }

        return result;
    },

    applyRule: (firstNumber, secondNumber, rulesObtained) => {
        if(firstNumber == secondNumber)
            return [0, `${firstNumber} = ${secondNumber}`];

        if(getValueRulesOnly(firstNumber,secondNumber).length > 0)
            return [0, `${firstNumber} has the value of ${secondNumber}`]; // they have the same value so equate

        const numOneGreatest = rulesObtained.filter(r => r.type === Rule.TYPES.BEST && (r.numberOne == firstNumber || r.numberTwo == firstNumber)).length > 0;
        const numTwoGreatest = rulesObtained.filter(r =>r.type === Rule.TYPES.BEST && (r.numberOne == secondNumber || r.numberTwo == secondNumber)).length > 0;

        if(numOneGreatest && numTwoGreatest)
            return [descendingSort(firstNumber, secondNumber), undefined]

        let bothNumberRules = rulesObtained.filter(r => (r.numberOne == firstNumber || r.numberTwo == firstNumber) &&
            (r.numberOne == secondNumber || r.numberTwo == secondNumber));
        let betterRules = bothNumberRules.filter(r => r.type === Rule.TYPES.BETTER);
        let equalRules = bothNumberRules.filter(r => r.type === Rule.TYPES.EQUAL);

        if((numOneGreatest || numTwoGreatest) && equalRules.length > 0)
            return [descendingSort(firstNumber, secondNumber), undefined]

        let twoBetter = betterRules.filter(r => r.numberTwo == secondNumber).length > 0;
        if(numOneGreatest && twoBetter > 0)
            return [descendingSort(firstNumber, secondNumber), undefined]

        let oneBetter = betterRules.filter(r => r.numberOne == firstNumber).length > 0;
        if(numTwoGreatest && oneBetter > 0)
            return [descendingSort(firstNumber, secondNumber), undefined]

        if(numOneGreatest)
            return [-1, `${firstNumber} is the greatest`];
        if(numTwoGreatest)
            return [1, `${secondNumber} is the greatest`];

        if(equalRules.length > 0 && betterRules.length > 0)
            return [descendingSort(firstNumber, secondNumber), undefined]

        if(equalRules.length > 0)
            return [0, `${firstNumber} = ${secondNumber}`];

        if(betterRules.length > 0) {
            if(oneBetter && twoBetter)
                return [descendingSort(firstNumber, secondNumber), undefined]
            else if(oneBetter)
                return [-1, `${firstNumber} > ${secondNumber}`];
            else
                return [1, `${secondNumber} > ${firstNumber}`];
        }

        return [descendingSort(firstNumber, secondNumber), undefined]
    },

    needsReroll: (number, channelId) => {
        return getRulesForNumber(number, channelId).filter(r => r.type === Rule.TYPES.REROLL).length > 0;
    },

    setup: (client, dbClient) => {
        db = dbClient;
        loadRules();

        client.on('message', async (message) => {
            let {content} = message
            content = content.trim();

            const channelId = message.channel.id;
            const channel = await client.channels.fetch(channelId)
            let splitContent = content.split(' ');
            if (content.startsWith('!addRule')) {
                const newUUID = uuid();
                if(splitContent.length === 4 && splitContent[1] === 'greater') {
                    addRule(newUUID, Rule.TYPES.BETTER, splitContent[2], splitContent[3]).then(r => rules[newUUID] = r)
                } else if(splitContent.length === 4 && splitContent[1] === 'equals') {
                    addRule(newUUID, Rule.TYPES.EQUAL, splitContent[2], splitContent[3]).then(r => rules[newUUID] = r)
                } else if(splitContent.length === 3 && splitContent[1] === 'greatest') {
                    addRule(newUUID, Rule.TYPES.BEST, splitContent[2]).then(r => rules[newUUID] = r)
                } else if(splitContent.length > 4 && splitContent[1] === 'text') {
                    addRule(newUUID, Rule.TYPES.TEXT, splitContent[2], undefined, splitContent.slice(3).join(' ')).then(r => rules[newUUID] = r)
                } else if(splitContent.length === 3 && splitContent[1] === 'flip') {
                    addRule(newUUID, Rule.TYPES.FLIPS, splitContent[2]).then(r => rules[newUUID] = r)
                } else if(splitContent.length === 3 && splitContent[1] === 'reroll') {
                    addRule(newUUID, Rule.TYPES.REROLL, splitContent[2]).then(r => rules[newUUID] = r)
                } else if(splitContent.length === 4 && splitContent[1] === 'value') {
                    addRule(newUUID, Rule.TYPES.VALUE, splitContent[2], splitContent[3]).then(r => rules[newUUID] = r)
                } else {
                    channel.send('Invalid syntax.\n\`!addRule greater number number\`\n\`!addRule equals number number\`\n\`!addRule greatest number\`\n\`!addRule flip number\`\n\`!addRule reroll number\`\n\`!addRule text number DESCRIPTION\`\n\`!addRule value number number\`');
                    return;
                }
                channel.send(`Rule added. (ID = ${newUUID})`);
            }
            else if (content.startsWith('!removeRules') && splitContent.length === 2) {
                let filtered = Object.keys(rules).map(key => [key, rules[key]]).filter(pair => pair[1].numberOne == splitContent[1] || pair[1].numberTwo == splitContent[1]) || [];

                if(filtered.length > 0) {
                    deleteRules(filtered.map(pair => pair[0])).then(_ => {
                        for(let i = 0; i < filtered.length; i++) {
                            delete rules[filtered[i][0]]
                        }
                        channel.send('All rules removed.');
                    })
                } else {
                    channel.send('No rules found.');
                }
            }
            else if (content.startsWith('!removeRuleById') && splitContent.length === 2) {
                let id = splitContent[1];
                if(rules[id]) {
                    deleteRules([id]).then(_ => {
                        delete rules[id];
                        channel.send('Rule removed.');
                    })
                } else {
                    channel.send('Rule not found.');
                }
            }
            else if(splitContent.length === 2 && splitContent[0] === '!checkRule') {
                let filtered = getRulesForNumber(splitContent[1], channelId, true);
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
            else if(content === '!listRules') {
                let keys = Object.keys(rules);
                keys.sort((k1, k2) => rules[k1].numberOne - rules[k2].numberOne)
                let keysLength = keys.length;
                let texts = [keysLength === 0 ? 'There are no rules set!' : keysLength === 1 ? 'The only rule is:\n' : 'The rules are:\n'];
                let j = 0
                let length = keysLength;
                for(let i = 0; i < length; i++) {
                    let id = keys[i];
                    let text = `${rules[id].display()}\t\`[ID = ${id}]\`` + (i === length - 1 ? '' : '\n');

                    let currentText = texts[j]
                    if(currentText.length + text.length > 2000) {
                        j++
                        texts.push('');
                    }

                    texts[j] += text;
                }
                sendMessages(channel, texts, 0);
            }
        });
    }
}

let sendMessages = (channel, messages, index) => {
    if(index >= messages.length)
        return;

    let text = messages[index]
    channel.send(text).then(_ => sendMessages(channel, messages, index+1));
}