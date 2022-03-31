import {Rule} from "./Rule";
import {Database} from "./Database";

const INSERT_SQL = 'INSERT INTO RULES(id, type, numberone, numbertwo, description, game) VALUES($1, $2, $3, $4, $5, $6)';
const DELETE_SQL = 'DELETE FROM RULES WHERE id = ANY($1::varchar[])';
const SELECT_SQL = 'SELECT * FROM RULES';

export class Rules {
    allRules : {[id:string] : Rule} = {}
    private static INSTANCE : Rules;
    static GAMES : string[] = ['cs', 'csgo', 'dota', 'dota2'];

    static sharedInstance() : Rules {
        if(!Rules.INSTANCE)
            Rules.INSTANCE = new Rules();

        return Rules.INSTANCE;
    }

    private db : Database;

    constructor() {
        this.allRules = {}
        this.db = Database.sharedInstance();
        this.db.connect().then(() => {
            this.loadRules();
        });
    }

    static allRules() {
        return this.sharedInstance().allRules;
    }

    loadRules() : void {
        this.db.query(SELECT_SQL).then((res: { rows: {
            id:string, type?:string, numberone?:number, numbertwo?:number, description?:string, game?:string
        }[] }) => {
            if(res && res.rows) {
                for(let i = 0; i < res.rows.length; i++) {
                    let row = res.rows[i];
                    this.allRules[row.id] = new Rule(row.id, row.type as Rule.TYPES, row.numberone, row.numbertwo, row.description, row.game);
                }
            }
        }).catch(e => {
            console.error(e);
        })
    }

    addRule (id: string, type: Rule.TYPES, numberOne: number, numberTwo?: number, description?: string, game?: string) : Promise<void> {
        const rule = new Rule(id, type, numberOne, numberTwo, description, game);
        return this.db.query(INSERT_SQL, [id, type, numberOne, numberTwo, description, game]).then(_ => {
            return Promise.resolve(rule);
        }).then(rule => {
            this.allRules[id] = rule;
            return Promise.resolve();
        }).catch(e => {
            console.error(e);
            return Promise.resolve()
        })
    }

    deleteRules (ruleIds: string[]) : Promise<void> {
        return this.db.query(DELETE_SQL, [ruleIds]).then(_ => {
            return Promise.resolve();
        }).then(() => {
            for(let i = 0; i < ruleIds.length; i++) {
                delete this.allRules[ruleIds[i]]
            }
        }).catch(e => {
            console.error(e);
            return Promise.resolve();
        })
    }
}