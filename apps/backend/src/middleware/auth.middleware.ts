import type { Request, Response, NextFunction } from "express";
import { getActiveAdmin, verifyAdminToken } from "../services/auth.service";

export interface AuthenticatedAdmin {
  adminId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
    }
  }
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.refundiq_admin_token;

    if (!token || typeof token !== "string") {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const payload = verifyAdminToken(token);

    // Check the database on each request so a disabled admin
    // loses access even if their JWT has not expired.
    const admin = await getActiveAdmin(payload.adminId);

    if (!admin) {
      res.clearCookie("refundiq_admin_token", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });

      res.status(401).json({
        success: false,
        message: "Admin account is inactive or no longer exists.",
      });
      return;
    }

    req.admin = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    };

    next();
  } catch {
    res.clearCookie("refundiq_admin_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication session.",
    });
  }
}

export function requireAdminRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.admin || req.admin.role !== "ADMIN") {
    res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action.",
    });
    return;
  }

  next();
}
