export class Rule {
    constructor(id:string, type:Rule.TYPES, numberOne?:number, numberTwo?:number, description?:string) {
        this.id = id
        this.type = type;
        this.numberOne = numberOne;
        this.numberTwo = numberTwo;
        this.description = description;
    }

    id : string;
    type : Rule.TYPES;
    numberOne ?: number = 0;
    numberTwo ?: number = 0;
    description ?: string = '';

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
            case Rule.TYPES.SWAP:
                return `${this.numberOne} causes the following swaps to occur: ${this.getSwapsString()}`
            default:
                return `[${this.type}], [${this.numberOne}], [${this.numberTwo}], [${this.description}]`;
        }
    }

    getNegativeSwappingString(index:number) {
        return (index < 0 ? 'x' : '') + index
    }

    getSwapsArray = (): [[number, number]]|undefined => {
        if(this.description) {
            return JSON.parse(this.description)
        } else {
            return undefined
        }
    }

    getSwapsString = () => {
        const swaps: [[number, number]]|undefined  = this.getSwapsArray()
        if(swaps) {
            return swaps.map(swap => {
                const swap1 = swap[0];
                const swap2 = swap[1];
                return `\`User#${this.getNegativeSwappingString(swap1)} swaps with User#${this.getNegativeSwappingString(swap2)}\``
            }).join(' | ')
        } else {
            return 'No swaps defined!'
        }
    }

    duplicateButReplacingNumber = (originalNumber: number, newNumber: number) => {
        let result;
        if(this.numberOne != originalNumber && this.numberTwo != originalNumber) {
            result = undefined;
        }
        else if(this.numberOne == originalNumber) {
            result = new Rule(this.id, this.type, newNumber, this.numberTwo, this.description);
        } else {
            result = new Rule(this.id, this.type, this.numberOne, newNumber, this.description);
        }
        return result;
    }

    getOtherNumber (number:number) {
        if(this.numberOne == number)
            return this.numberTwo;
        else if(this.numberTwo == number)
            return this.numberOne;
        else return undefined;
    }
}

export namespace Rule {
    export enum TYPES {
        BETTER="better",
        BEST="best",
        TEXT="text",
        EQUAL="equal",
        FLIPS="flips",
        REROLL="reroll",
        VALUE="value",
        SWAP="swap"
    }
}