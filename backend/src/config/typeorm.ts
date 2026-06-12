import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";
import configEnv from "./config";

dotenv.config();

export const DB = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || configEnv.db.host,
  port: Number(process.env.DB_PORT || configEnv.db.port || 5432),
  username: process.env.DB_USER || configEnv.db.user,
  password: process.env.DB_PASS || process.env.DB_PASSWORD || configEnv.db.password,
  database: process.env.DB_NAME || configEnv.db.name,

  ssl: {
    rejectUnauthorized: false,
  },
  
  synchronize: true, 
  logging: false,
  entities: [path.join(__dirname, '../**/entities/*.entity.{ts,js}')],
  subscribers: [],
  migrations: [],
});

export const initOrm = async (): Promise<void> => {
    try {
        console.log("[orm]: Initializing ORM ");
        await DB.initialize();
        console.log("[orm]: ORM initialized successfully");
    } catch (error) {
        console.log("[orm]: ORM initialization failed");
        console.error(error);
        throw error;
    }
};
