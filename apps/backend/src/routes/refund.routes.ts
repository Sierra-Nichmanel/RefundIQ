import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

import { requireAdmin, requireAdminRole } from "../middleware/auth.middleware";

import {
  createRefundRequest,
  getAllRefundRequests,
  getRefundRequestById,
  reviewRefundRequest,
} from "../services/refund.service";

const router = Router();

const createRefundSchema = z.object({
  orderNumber: z.string().trim().min(1).max(50),
  customerEmail: z.string().trim().email().max(254),
  reason: z.string().trim().min(5).max(2000),
});

const reviewRefundSchema = z.object({
  decision: z.enum(["APPROVED", "DENIED"]),

  reviewNotes: z
    .string()
    .trim()
    .min(5, "Please provide a meaningful review note.")
    .max(2000, "Review notes cannot exceed 2000 characters."),
});

// POST /api/refunds
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = createRefundSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Please provide valid refund request details.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    const refund = await createRefundRequest(validation.data);

    res.status(201).json({
      success: true,
      message: "Refund request evaluated successfully.",
      data: refund,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/refunds
router.get("/", requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const refunds = await getAllRefundRequests();

    res.status(200).json({
      success: true,
      count: refunds.length,
      data: refunds,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/refunds/:id
router.get("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refundId = req.params.id;

    if (typeof refundId !== "string") {
      res.status(400).json({
        success: false,
        message: "A valid refund ID is required.",
      });
      return;
    }

    const refund = await getRefundRequestById(refundId);

    res.status(200).json({
      success: true,
      data: refund,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/refunds/:id/review
router.patch(
  "/:id/review",
  requireAdmin,
  requireAdminRole,
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const refundId = req.params.id;

      if (
        typeof refundId !== "string" ||
        refundId.trim().length === 0
      ) {
        res.status(400).json({
          success: false,
          message: "A valid refund ID is required.",
        });

        return;
      }

      const validation = reviewRefundSchema.safeParse(
        req.body,
      );

      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: "Please provide valid review details.",
          errors: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });

        return;
      }

      // requireAdmin has already authenticated the session
      // and populated req.admin.
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });

        return;
      }

      const refund = await reviewRefundRequest({
        refundRequestId: refundId,
        adminId: req.admin.adminId,
        decision: validation.data.decision,
        reviewNotes: validation.data.reviewNotes,
      });

      res.status(200).json({
        success: true,
        message: "Refund review completed successfully.",
        data: refund,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
