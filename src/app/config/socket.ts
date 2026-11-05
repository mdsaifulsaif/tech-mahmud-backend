// src/app/config/socket.ts
import { Server } from "socket.io";

let io: Server;

export const initSocket = (httpServer: any) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "https://sobjihaat-frontend-tau.vercel.app",
        "https://kinbonow.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "http://localhost:3006",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // User personal room
    socket.on("user-join", (data: { userID: string }) => {
      if (data?.userID) {
        socket.join(`user-${data.userID}`);
        console.log(`👤 User joined room: user-${data.userID}`);
      }
    });

    // Admin room
    socket.on("admin-join", (data: { adminID: string }) => {
      if (data?.adminID) {
        socket.join("admins");
        console.log(`👨‍💼 Admin joined: ${data.adminID}`);

        socket.emit("admin-join-ack", {
          success: true,
          message: "You have joined admin room",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  console.log("✅ Socket.IO initialized successfully");
  return io;
};

export const getIO = (): Server | null => {
  return io || null;
};
