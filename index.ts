
// // server.ts
// import dns from "dns";
// dns.setServers(["8.8.8.8", "8.8.4.4"]);
// import dotenv from "dotenv";
// import { createServer } from "http";
// import app from "./src/app";
// import connectDB from "./src/app/config/db";
// import { initSocket } from "./src/app/config/socket"; // ✅ শুধু initSocket

// dotenv.config();

// const PORT: number = Number(process.env.PORT) || 5001;

// const httpServer = createServer(app);


// if (process.env.USE_SOCKET === "true") {
//   const io = initSocket(httpServer);
//   (global as any).io = io;
//   console.log("✅ Socket.IO initialized");
// } else {
//   console.log("⚠️ Socket.IO disabled");
// }




// // Uncaught Exception Handling
// process.on("uncaughtException", (err) => {
//   console.log(`Error: ${err.message}`);
//   process.exit(1);
// });

// const startServer = async (): Promise<void> => {
//   try {
//     await connectDB();

//     const server = httpServer.listen(PORT, () => {
//       console.log(`=================================`);
//       console.log(`🚀 Server running on port ${PORT}`);
//       console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
//       console.log(`=================================`);
//     });

//     process.on("unhandledRejection", (err: Error) => {
//       console.log(`Error: ${err.message}`);
//       server.close(() => process.exit(1));
//     });
//   } catch (error) {
//     console.error("❌ Failed to start server:", error);
//     process.exit(1);
//   }
// };

// startServer();



import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import dotenv from "dotenv";
import { createServer } from "http";
import app from "./src/app"; // ✅ app.ts থেকে import করা হলো
import connectDB from "./src/app/config/db";
import { initSocket } from "./src/app/config/socket";

dotenv.config();

const PORT: number = Number(process.env.PORT) || 5001;
const httpServer = createServer(app);

// --- Socket.IO Optional Check ---
const isSocketEnabled = process.env.USE_SOCKET !== "false";
if (isSocketEnabled) {
  const io = initSocket(httpServer);
  (global as any).io = io;
  console.log("✅ Socket.IO initialized");
} else {
  console.log("⚠️ Socket.IO disabled");
}

// --- Uncaught Exception Handling ---
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});

// --- Start Server ---
const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    const httpServerInstance = httpServer.listen(PORT, () => {
      console.log(`=================================`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`=================================`);
    });

    process.on("unhandledRejection", (err: Error) => {
      console.log(`Error: ${err.message}`);
      httpServerInstance.close(() => process.exit(1));
    });

    // Graceful shutdown on nodemon restart or termination
    const handleShutdown = (signal: string) => {
      httpServerInstance.close(() => {
        if (signal === "SIGUSR2") {
          process.kill(process.pid, "SIGUSR2");
        } else {
          process.exit(0);
        }
      });
    };

    process.once("SIGTERM", () => handleShutdown("SIGTERM"));
    process.once("SIGINT", () => handleShutdown("SIGINT"));
    process.once("SIGUSR2", () => handleShutdown("SIGUSR2"));
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();