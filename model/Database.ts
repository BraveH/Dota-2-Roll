import {Client} from "pg";

export class Database {
    db : Client
    private static INSTANCE : Database;

    constructor() {
        this.db = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }

    static sharedInstance() : Database {
        if(!Database.INSTANCE)
            Database.INSTANCE = new Database();

        return Database.INSTANCE;
    }

    connect() {
        return this.db.connect()
    }

    query(sql: string, values?: any[]) {
        return this.db.query(sql, values);
    }
}