import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createApiRouter } from "./routes";

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ];
      if (allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev, configurable in prod
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-internal-service-key",
      "x-admin-key",
      "x-user-role",
      "x-is-demo",
      "x-user-email",
      "x-user-id",
    ],
    exposedHeaders: ["set-cookie"],
  })
);

// Body and Cookie Parsers
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "test") {
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Root Information Route
app.get("/", (req, res) => {
  res.json({
    name: "BloodLink Backend API Service",
    status: "healthy",
    version: "0.1.0",
    apiPrefix: "/api",
    timestamp: new Date().toISOString(),
  });
});

// Mount All API Routes
app.use("/api", createApiRouter());

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Backend Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err?.message || "An unexpected error occurred",
  });
});

// Start Server if not imported by tests
if (process.env.NODE_ENV !== "test" || !module.parent) {
  app.listen(PORT, () => {
    console.log(`🩸 BloodLink Backend Server listening on http://localhost:${PORT}`);
    console.log(`📡 Connected to frontend proxy at ${FRONTEND_URL}`);
  });
}

export default app;
