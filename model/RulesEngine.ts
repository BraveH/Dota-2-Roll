import {Rule} from "./Rule";
import {Rules} from "./Rules";

export class RulesEngine {
    private static INSTANCE : RulesEngine;

    static sharedInstance() : RulesEngine {
        if(!RulesEngine.INSTANCE)
            RulesEngine.INSTANCE = new RulesEngine();

        return RulesEngine.INSTANCE;
    }

    /* PUBLIC FUNCTIONS */
    getRulesForNumber = (number:number, includeEquates = false) => {
        return Object.values(Rules.allRules()).filter(rule => rule.numberOne == number || rule.numberTwo == number)
            .filter(r => includeEquates ? true : r.type === Rule.TYPES.EQUAL);
    }

    getDescriptionRules(number: number, game ?: string) {
        return Object.values(Rules.allRules()).filter(rule => rule.numberOne == number && rule.type === Rule.TYPES.TEXT && (!game || rule.game === game)).map(r => r.description);
    }

    doesNumberFlip(number: number) {
        return Object.values(Rules.allRules()).find(rule => rule.numberOne == number && rule.type === Rule.TYPES.FLIPS);
    }

    doesNumberSwap(number: number) {
        return Object.values(Rules.allRules()).find(rule => rule.numberOne == number && rule.type === Rule.TYPES.SWAP);
    }

    shouldNumberReRoll(number: number) {
        return Object.values(Rules.allRules()).find(rule => rule.numberOne == number && rule.type === Rule.TYPES.REROLL);
    }
}