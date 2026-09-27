import "dotenv/config";

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";

import refundRoutes from "./routes/refund.routes";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";

const app = express();

const PORT = Number(process.env.PORT) || 5000;

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10kb" }));

app.use(cookieParser());

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "RefundIQ API is running.",
    timestamp: new Date().toISOString(),
  });
});

// Auth API routes
app.use("/api/auth", authRoutes);

// Refund API routes
app.use("/api/refunds", refundRoutes);


// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "The requested endpoint was not found.",
  });
});

// Central error handler
app.use(
  (
    error: Error & { statusCode?: number },
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      console.error("RefundIQ API error:", error.message);
    }

    res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "An unexpected server error occurred."
          : error.message,
    });
  },
);

app.listen(PORT, () => {
  console.log(`RefundIQ API running on port ${PORT}`);
});
