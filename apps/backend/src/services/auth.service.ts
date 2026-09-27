import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/database";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 64) {
    throw new Error(
      "JWT_SECRET must be set to a randomly generated secret of at least 32 bytes (64 hex characters).",
    );
  }

  return secret;
}

const TOKEN_EXPIRY = "8h";

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: string;
}

export async function loginAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const admin = await prisma.admin.findUnique({
    where: { email: normalizedEmail },
  });

  // Use the same generic error for invalid email and password.
  if (!admin || !admin.isActive) {
    throw new Error("Invalid email or password.");
  }

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);

  if (!passwordMatches) {
    throw new Error("Invalid email or password.");
  }

  const payload: AdminTokenPayload = {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  };

  const token = jwt.sign(payload, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRY,
    issuer: "refundiq",
    audience: "refundiq-admin",
  });

  return {
    token,
    admin: {
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
    },
  };
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret(), {
    issuer: "refundiq",
    audience: "refundiq-admin",
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.adminId !== "string" ||
    typeof decoded.email !== "string" ||
    typeof decoded.role !== "string"
  ) {
    throw new Error("Invalid authentication token.");
  }

  return {
    adminId: decoded.adminId,
    email: decoded.email,
    role: decoded.role,
  };
}

export async function getActiveAdmin(adminId: string) {
  return prisma.admin.findFirst({
    where: {
      id: adminId,
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });
}
