import { Router } from "express";
import { z } from "zod";
import { getActiveAdmin, loginAdmin } from "../services/auth.service";
import { requireAdmin } from "../middleware/auth.middleware";

const router = Router();

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 8 * 60 * 60 * 1000,
};

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid email and password.",
      });
      return;
    }

    const { email, password } = validation.data;

    const result = await loginAdmin(email, password);

    res.cookie("refundiq_admin_token", result.token, cookieOptions);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      admin: result.admin,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Invalid email or password."
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    next(error);
  }
});

// GET /api/auth/me
router.get("/me", requireAdmin, async (req, res, next) => {
  try {
    const admin = await getActiveAdmin(req.admin!.adminId);

    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Admin account not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      admin,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.clearCookie("refundiq_admin_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

export default router;
