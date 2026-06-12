import config from "./config";
import express, { Request, Response } from "express";
import indexRoutes from "../routes/index.routes";
import cors from "cors";

/**
 * EXPRESS es el framework que usamos para construir la API y los servidores web
 */
export default class Server {
  public app: express.Application;
  public port: number;

  private readonly corsOptions = {
    origin: ["http://localhost:4200", "http://127.0.0.1:4200"],
    // Http methods allowed
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    // Content-type it´s for json apps
    // x-request to use XMLHttpRequest
    // Accept to indicate response waited
    allowedHeaders: [
      "Content-Type",
      "X-Requested-With",
      "Accept",
      "Authorization",
    ],
  };

  

  constructor() {
    this.app = express();
    this.port = config.PORT;

    // Middlewares básicos
    this.app.use(express.json({ limit: "50mb" })); 
    this.app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  //  this.app.use(cors(this.corsOptions));
    this.app.use(cors({ origin: '*' }));  //en una produccion real no hariamos esto

    // Ruta raíz obtención de respuestas
    this.app.get("/", (_req: Request, res: Response) => {
      res.send("Express + TypeScript Server");
    });

    this.app.use("/api", indexRoutes);

    // Carpeta de assets (si se usan)
    // this.app.use('/assets', express.static(path.join(__dirname, '../../assets')));
  }

  public start(callback: () => void): void {
    this.app.listen(this.port, callback);
  }
}
