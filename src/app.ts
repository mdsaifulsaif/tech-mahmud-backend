import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./app/routes/routes";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";

const app: Application = express();

// --- Standard Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Allowed origins for CORS
const allowedOrigins = [
  "https://tech-mahmud-frontend.vercel.app",
  "https://tech-mahmud-dashboard.vercel.app",
  "https://tech-mahmud-backend.vercel.app",
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.DASHBOARD_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://localhost:3005",
  "http://localhost:3006",
].filter(Boolean) as string[];

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check explicit allowed origins or any vercel.app preview deployment or localhost
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        /^http:\/\/localhost:\d+$/.test(origin);

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  }),
);

// --- Root API Route ---
app.use("/api/v1", router);

// --- Testing Route ---
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Tech Mahmud Ecommerce API is running!",
  });
});

// --- 404 Handler (Global) ---
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Not Found",
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API Not Found",
      },
    ],
  });
});

app.use(globalErrorHandler);

export default app;
