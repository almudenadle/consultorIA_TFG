import Server from "./config/express";
import { initOrm } from "./config/typeorm";
import "reflect-metadata";

const server = new Server();

const startApp = async () => {
  try {
    // Initialize database connection
    await initOrm();

    // Start server
    server.start(() => {
      console.log(
        `[server]: Server is running at http://localhost:${server.port}`
      );
    });
  } catch (error) {
    console.error("[server]: Failed to start server:", error);
    process.exit(1);
  }
};

startApp();
