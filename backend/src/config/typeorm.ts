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
    }
};


// import { DataSource } from "typeorm"
// import dotenv from "dotenv"
// import path from "path"
// import configEnv from "./config"

// dotenv.config();

// // export const DB = new DataSource({
// //     type: "postgres",
// //     host: configEnv.db.host,
// //     port: configEnv.db.port,
// //     username: configEnv.db.user,
// //     password: configEnv.db.password,
// //     database: configEnv.db.name,
// //     entities: [path.join(__dirname, '../**/entities/*.entity.{ts,js}')],    synchronize: true,
// // });
// export const DB = new DataSource({
//   type: 'postgres',
//   host: process.env.DB_HOST,
//   port: parseInt(process.env.DB_PORT || '5432'),
//   username: process.env.DB_USER,
//   password: process.env.DB_PASSWORD || process.env.DB_PASS, // Por si acaso pusiste DB_PASS en Joi
//   database: process.env.DB_NAME,
//   synchronize: true, 
//   logging: false,
  
//   // Le dice a TypeORM que busque en la carpeta dist (producción) o src (local) 
//   // cualquier archivo que termine en .entity.js o .entity.ts
//   entities: [path.join(__dirname, '../**/entities/*.entity.{ts,js}')],
  
//   subscribers: [],
//   migrations: [],
// });

// export const initOrm = async () => {
//     try {
//         console.log("[orm]: Initializing ORM ");
//         await DB.initialize();
//         console.log(`[orm]: ORM initialized ${configEnv.db.host}:${configEnv.db.port}`);
//     }catch (error){
//         console.log("[orm]: ORM initialization failed");
//         console.log(error);
//     }
// };