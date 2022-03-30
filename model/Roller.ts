import {Rule} from "./Rule";

export class Roller {
    name : string = '';
    id : string = '';
    roll : number = Math.floor(Math.random() * 100) + 1;
    weight : number = 0
    rules : Rule[] = [];
    equalRollers : Roller[] = []
    betterThanRollers : Roller[] = []

    constructor(name: string, channel: any, id: string, roll?:number) {
        this.name = name;
        this.id = id;
        if(roll)
            this.roll = roll
        else
            this.reRoll();
    }

    reRoll() {
       this.roll = Math.floor(Math.random() * 100) + 1;
    }

    getMaxEqualWeight(idsUsed : string[]) : number {
        return Math.max(this.weight,
            this.equalRollers.filter(r => !idsUsed.includes(r.id))
            .reduce((acc, roller) => Math.max(acc,roller.getMaxEqualWeight([...idsUsed, this.id])), 0))
    }


    setMaxEqualWeight(weightToSet?:number) {
        if(this.equalRollers.length === 0)
            return;

        if(weightToSet) {
            this.weight = weightToSet;
        } else {
            this.weight = this.getMaxEqualWeight([]);
        }
        const rollers = [...this.equalRollers];
        this.equalRollers = [];
        rollers.forEach(r => r.setMaxEqualWeight(weightToSet || this.weight))
    }

    getMaxGreaterThanWeight() : number {
        return Math.max(this.weight,
            this.betterThanRollers
                .reduce((acc, roller) => Math.max(acc,roller.weight), 0))
    }


    setMaxGreaterThanWeight() {
        if(this.betterThanRollers.length === 0)
            return;

        this.weight = this.getMaxGreaterThanWeight() + 1;
    }
}