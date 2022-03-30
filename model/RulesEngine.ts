import {Rule} from "./Rule";
import {Rules} from "./Rules";

export class RulesEngine {
    private rulesCache : {
        [channelId:string]:{
            [ruleNumber:number]:Rule[]
        }
    } = {};
    private static INSTANCE : RulesEngine;

    static sharedInstance() : RulesEngine {
        if(!RulesEngine.INSTANCE)
            RulesEngine.INSTANCE = new RulesEngine();

        return RulesEngine.INSTANCE;
    }

    getRulesForNumber = (number:number, channelId:string, includeEquates = false) => {
        let cache = this.rulesCache[channelId] || {};
        if(cache[number]) {
            return cache[number].filter(r => includeEquates ? true : r.type !== Rule.TYPES.EQUAL);
        }

        let rulesForNumber = this._getRulesForNumber(number, [number])[0] as unknown as Rule[];
        console.log("RULES:",number,rulesForNumber);
        cache[number] = rulesForNumber;
        this.rulesCache[channelId] = cache;
        return rulesForNumber.filter(r => includeEquates ? true : r.type === Rule.TYPES.EQUAL);
    }

    private _getRulesForNumber = (number: number, equatedValues: number[]) : (Rule[]|number[])[] => {
        let [valueRules, newEquatedValues] = this.getValueRules(number, equatedValues || [number]);
        let numberRules = Object.values(Rules.allRules()).filter(rule => rule.numberOne == number || rule.numberTwo == number);
        return [[
            ...numberRules,
            ...(valueRules as Rule[])
        ], newEquatedValues];

    }

    private getValueRules = (number: number, equatedValues: number[]) : (Rule[]|number[])[]=>{
        let tempEquatedValues = equatedValues;
        let valueRules = Object.values(Rules.allRules()).filter(rule => {
            let otherNumber = rule.getOtherNumber(number);
            return rule.type === Rule.TYPES.VALUE &&
                (rule.numberOne == number || rule.numberTwo == number) &&
                otherNumber !== undefined &&
                tempEquatedValues.filter(v => v == otherNumber).length < 1
        })
            .map(rule => {
                    if(!rule)
                        return [];

                    let otherNumber = rule.getOtherNumber(number);
                    if(otherNumber === undefined)
                        return [];

                    if(tempEquatedValues.filter(v => v == otherNumber).length > 0)
                        return [];

                    let [rulesForNumber, newEquatedValues] = this._getRulesForNumber(otherNumber, [...tempEquatedValues, otherNumber]);
                    tempEquatedValues = newEquatedValues as number[];

                    return (rulesForNumber as Rule[])
                        .map(ruleForOtherNumber => ruleForOtherNumber.duplicateButReplacingNumber(otherNumber as number, number)).filter(r => r !== undefined) as Rule[];
                }
            ).reduce((acc, arr) => [...acc, ...(arr || [])], []);
        return [valueRules, tempEquatedValues];
    }

    private getValueRulesForNum = (numberOne?: number) => {
        return Object.values(Rules.allRules()).filter(
            rule => (rule.numberOne == numberOne || rule.numberTwo == numberOne)
                && rule.type === Rule.TYPES.VALUE
        )
    }

    private getValueRulesOnly = (numberOne?: number, numberTwo?: number) => {
        return Object.values(Rules.allRules()).filter(
            rule => (rule.numberOne == numberOne || rule.numberTwo == numberOne)
                && (rule.numberOne == numberTwo || rule.numberTwo == numberTwo)
                && rule.type === Rule.TYPES.VALUE
        )
    }

    private descendingSort = (firstNumber: number, secondNumber: number) => {
        return secondNumber - firstNumber
    }

    /* PUBLIC FUNCTIONS */

    clearCache(channelId:string) {
        delete this.rulesCache[channelId];
        this.rulesCache[channelId] = {};
    }

    getRules(firstNumber: number, secondNumber: number, channelId: string): Rule[]  {
        let result: Rule[] = []

        if(firstNumber) {
            const numberOneRules = this.getRulesForNumber(firstNumber, channelId);
            result = [...numberOneRules.filter(rule => rule.type === Rule.TYPES.BEST || rule.type === Rule.TYPES.TEXT ||
            rule.type === Rule.TYPES.REROLL || rule.type === Rule.TYPES.FLIPS)];
        }
    
        if(secondNumber) {
            const numberTwoRules = this.getRulesForNumber(secondNumber, channelId);
            result = [...result, ...numberTwoRules.filter(rule => rule.type === Rule.TYPES.BEST || rule.type === Rule.TYPES.TEXT ||
                rule.type === Rule.TYPES.REROLL || rule.type === Rule.TYPES.FLIPS)];
        }
    
        if(firstNumber && secondNumber) {
            result = [...result, ...Object.values(Rules.allRules()).filter(rule =>
                (rule.numberOne == firstNumber || rule.numberTwo == firstNumber) &&
                (rule.numberOne == secondNumber || rule.numberTwo == secondNumber) &&
                rule.type !== Rule.TYPES.VALUE
            )];
        }
    
        return result;
    }

    getDescriptionRules(number: number, channelId: string) {
        let cache = this.rulesCache[channelId] || {};
        if(cache[number]) {
            return cache[number].filter(r => r.type === Rule.TYPES.TEXT).map(r => r.description);
        }
        return Object.values(Rules.allRules()).filter(rule => rule.numberOne == number && rule.type === Rule.TYPES.TEXT).map(r => r.description);
        // return this.getRulesForNumber(number, channelId).filter(r => r.type === Rule.TYPES.TEXT).map(r => r.description);
    }

    doesNumberFlip(number: number, channelId: string) {
        let cache = this.rulesCache[channelId] || {};
        if(cache[number]) {
            return cache[number].find(r => r.type === Rule.TYPES.FLIPS);
        }
        return Object.values(Rules.allRules()).find(rule => rule.numberOne == number && rule.type === Rule.TYPES.FLIPS);
        // let rulesForNumber = this.getRulesForNumber(number, channelId);
        // return rulesForNumber.find(r => r.type === Rule.TYPES.FLIPS) !== undefined;
    }

    shouldNumberReRoll(number: number, channelId: string) {
        let cache = this.rulesCache[channelId] || {};
        if(cache[number]) {
            return cache[number].find(r => r.type === Rule.TYPES.REROLL);
        }
        return Object.values(Rules.allRules()).find(rule => rule.numberOne == number && rule.type === Rule.TYPES.REROLL);
        // return this.getRulesForNumber(number, channelId).filter(r => r.type === Rule.TYPES.REROLL).length > 0;
    }

    findInvalidGreaterRule(filteredRules: Rule[]) {
        // any greater than rule that has same number on both sides
        return filteredRules
        .find(r => r.type === Rule.TYPES.BETTER && r.numberOne == r.numberTwo && r.numberOne !== undefined) !== undefined
    }

    applyRule(firstNumber: number, secondNumber: number, rulesObtained: Rule[]) {
        if(firstNumber == secondNumber)
            return [0, `${firstNumber} = ${secondNumber}`];

        if(this.getValueRulesOnly(firstNumber,secondNumber).length > 0)
            return [0, `${firstNumber} has the value of ${secondNumber}`]; // they have the same value so equate

        const numOneGreatest = rulesObtained.filter(r => r.type === Rule.TYPES.BEST && (r.numberOne == firstNumber || r.numberTwo == firstNumber)).length > 0;
        const numTwoGreatest = rulesObtained.filter(r =>r.type === Rule.TYPES.BEST && (r.numberOne == secondNumber || r.numberTwo == secondNumber)).length > 0;

        if(numOneGreatest && numTwoGreatest)
            return [this.descendingSort(firstNumber, secondNumber), undefined]

        let bothNumberRules = rulesObtained.filter(r => (r.numberOne == firstNumber || r.numberTwo == firstNumber) &&
            (r.numberOne == secondNumber || r.numberTwo == secondNumber));
        let betterRules = bothNumberRules.filter(r => r.type === Rule.TYPES.BETTER);
        let equalRules = bothNumberRules.filter(r => r.type === Rule.TYPES.EQUAL);

        if((numOneGreatest || numTwoGreatest) && equalRules.length > 0)
            return [this.descendingSort(firstNumber, secondNumber), undefined]

        let twoBetter = betterRules.filter(r => r.numberTwo == secondNumber).length > 0;
        if(numOneGreatest && twoBetter)
            return [this.descendingSort(firstNumber, secondNumber), undefined]

        let oneBetter = betterRules.filter(r => r.numberOne == firstNumber).length > 0;
        if(numTwoGreatest && oneBetter)
            return [this.descendingSort(firstNumber, secondNumber), undefined]

        if(numOneGreatest)
            return [-1, `${firstNumber} is the greatest`];
        if(numTwoGreatest)
            return [1, `${secondNumber} is the greatest`];

        if(equalRules.length > 0 && betterRules.length > 0)
            return [this.descendingSort(firstNumber, secondNumber), undefined]

        if(equalRules.length > 0)
            return [0, `${firstNumber} = ${secondNumber}`];

        if(betterRules.length > 0) {
            if(oneBetter && twoBetter)
                return [this.descendingSort(firstNumber, secondNumber), undefined]
            else if(oneBetter)
                return [-1, `${firstNumber} > ${secondNumber}`];
            else
                return [1, `${secondNumber} > ${firstNumber}`];
        }

        return [this.descendingSort(firstNumber, secondNumber), undefined]
    }
}