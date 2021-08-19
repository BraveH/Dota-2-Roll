const { v4: uuid } = require('uuid');

const INSERT_SQL = 'INSERT INTO RULES(id, type, numberone, numbertwo, description) VALUES($1, $2, $3, $4, $5)';
const DELETE_SQL = 'DELETE FROM RULES WHERE id in ($1)';
const SELECT_SQL = 'SELECT * FROM RULES';
let db = undefined;

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
                return `${this.numberOne}: ${this.description}`;
            case Rule.TYPES.EQUAL:
                return `${this.numberOne} = ${this.numberTwo}`
            case Rule.TYPES.FLIPS:
                return `${this.numberOne} flips rankings`
            case Rule.TYPES.REROLL:
                return `${this.numberOne} re-rolls`;
            default:
                return `[${this.type}], [${this.numberOne}], [${this.numberTwo}], [${this.description}]`;
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
    return db.query(DELETE_SQL, ruleIds.join(',')).then(r => {
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
        const numOneGreatest = firstNumberRules.find(r => r.type === Rule.TYPES.BEST) !== undefined;

        let secondNumberRules = rulesObtained.filter(r => !(r.numberOne === undefined || r.numberTwo === undefined) &&
            (r.numberOne === secondNumber || r.numberTwo === secondNumber));
        const numTwoGreatest = secondNumberRules.find(r =>r.type === Rule.TYPES.BEST) !== undefined;

        let bothNumberRules = rulesObtained.filter(r => (r.numberOne === firstNumber || r.numberTwo === firstNumber) &&
            (r.numberOne === secondNumber || r.numberTwo === secondNumber));
        let betterRules = bothNumberRules.filter(r => r.type === Rule.TYPES.BETTER);
        let equalRules = bothNumberRules.filter(r => r.type === Rule.TYPES.EQUAL);

        if(numOneGreatest && numTwoGreatest && firstNumber !== secondNumber)
            return [descendingSort(firstNumber, secondNumber), undefined]

        if(numOneGreatest || numTwoGreatest && firstNumber !== secondNumber && equalRules.length > 0)
            return [descendingSort(firstNumber, secondNumber), undefined]

        if(numOneGreatest || numTwoGreatest && betterRules.length > 0)
            return [descendingSort(firstNumber, secondNumber), undefined]

        if(numOneGreatest)
            return [1, `${firstNumber} is the greatest`];
        if(numTwoGreatest)
            return [-1, `${secondNumber} is the greatest`];

        if(equalRules.length > 0 && betterRules.length > 0)
            return [descendingSort(firstNumber, secondNumber), undefined]

        if(equalRules.length > 0)
            return [0, `${firstNumber} = ${secondNumber}`];

        if(betterRules.length > 0) {
            let oneBetter = betterRules.find(r => r.numberOne === firstNumber) !== undefined
            let twoBetter = betterRules.find(r => r.numberOne === secondNumber) !== undefined

            if(oneBetter && twoBetter)
                return [descendingSort(firstNumber, secondNumber), undefined]
            else if(oneBetter)
                return [1, `${firstNumber} > ${secondNumber}`];
            else
                return [-1, `${secondNumber} > ${firstNumber}`];
        }

        return [descendingSort(firstNumber, secondNumber), undefined]
    },

    needsReroll: (number) => {
        return getRulesForNumber(number).filter(r => r.type === Rule.TYPES.REROLL).length > 0;
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
                    addRule(newUUID, Rule.TYPES.TEXT, splitContent[2], undefined, splitContent.slice(2).join(' ')).then(r => rules[newUUID] = r)
                } else if(splitContent.length === 3 && splitContent[1] === 'flip') {
                    addRule(newUUID, Rule.TYPES.FLIPS, splitContent[2]).then(r => rules[newUUID] = r)
                } else if(splitContent.length === 3 && splitContent[1] === 'reroll') {
                    addRule(newUUID, Rule.TYPES.REROLL, splitContent[2]).then(r => rules[newUUID] = r)
                } else {
                    channel.send('Invalid syntax.\n!addRule greater number number\n!addRule equals number number\n!addRule greatest number\n!addRule flip number\n!addRule reroll number\n!addRule text number DESCRIPTION');
                    return;
                }
                channel.send(`Rule added. (ID = ${newUUID})`);
            }
            else if (content.startsWith('!removeRules') && splitContent.length === 2) {
                let filtered = Object.keys(rules).map(key => [key, rules[key]]).filter(pair => pair[1].numberOne === splitContent[1] || pair[1].numberTwo === splitContent[1]) || [];

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
            else if(content === '!listRules') {
                let keys = Object.keys(rules);
                let text = keys.length === 1 ? 'The only rule is:\n' : 'The rules are:\n';
                let length = keys.length;
                for(let i = 0; i < length; i++) {
                    let id = keys[i];
                    text += `${rules[id].display()}[ID = ${id}]` + (i === length - 1 ? '' : '\n');
                }
                channel.send(text);
            }
        });
    }
}