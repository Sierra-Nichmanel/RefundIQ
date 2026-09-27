import { Prisma } from "@prisma/client";
import prisma from "../config/database";
import { evaluateRefundPolicy } from "./refund-policy.service";
import { analyzeRefundRequest } from "./ai.service";

interface CreateRefundInput {
  orderNumber: string;
  customerEmail: string;
  reason: string;
}

export async function createRefundRequest(input: CreateRefundInput) {
  const email = input.customerEmail.trim().toLowerCase();

  // Find the order and its associated customer.
  const order = await prisma.order.findFirst({
    where: {
      orderNumber: input.orderNumber.trim(),
      customer: {
        email,
      },
    },
    include: {
      customer: true,
    },
  });

  // Avoid revealing whether an order belongs to another customer.
  if (!order) {
    const error = new Error(
      "We could not find an order matching those details.",
    );
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  // Evaluate eligibility using trusted database information.
  const policyResult = evaluateRefundPolicy(order, input.reason);

  // AI explains and classifies the request.
  // It cannot change the policy decision.
  const aiResult = await analyzeRefundRequest(input.reason, policyResult);

  console.log("RefundIQ AI result:", aiResult);

  const decision = policyResult.decision;

  // Persist the refund request and audit event atomically.
  const refundRequest = await prisma.$transaction(async (transaction) => {
    const refund = await transaction.refundRequest.create({
      data: {
        orderId: order.id,
        customerEmail: email,
        reason: input.reason.trim(),
        amount: new Prisma.Decimal(policyResult.refundAmount),
        status: decision,
        policyDecision: decision,

        // Deterministic policy result
        policyResult: policyResult as unknown as Prisma.InputJsonValue,

        // AI-generated supporting information
        aiClassification: aiResult.classification,
        aiExplanation: aiResult.explanation,
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            itemName: true,
            currency: true,
          },
        },
      },
    });

    await transaction.auditLog.create({
      data: {
        refundRequestId: refund.id,
        action: "REFUND_REQUEST_CREATED",
        details: {
          decision,
          reason: policyResult.reason,
          rulesTriggered: policyResult.rulesTriggered,
          refundAmount: policyResult.refundAmount,
          currency: policyResult.currency,
          aiClassification: aiResult.classification,
          aiExplanation: aiResult.explanation,
        },
      },
    });

    return refund;
  });

  return {
    id: refundRequest.id,
    orderNumber: refundRequest.order.orderNumber,
    itemName: refundRequest.order.itemName,
    amount: Number(refundRequest.amount),
    currency: refundRequest.order.currency,
    status: refundRequest.status,
    reason: refundRequest.reason,
    policy: policyResult,
    aiClassification: refundRequest.aiClassification,
    aiExplanation: refundRequest.aiExplanation,
    createdAt: refundRequest.createdAt,
    updatedAt: refundRequest.updatedAt,
  };
}

export async function getAllRefundRequests() {
  const refunds = await prisma.refundRequest.findMany({
    include: {
      order: {
        select: {
          orderNumber: true,
          itemName: true,
          currency: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return refunds.map((refund) => ({
    id: refund.id,
    orderNumber: refund.order.orderNumber,
    itemName: refund.order.itemName,
    customer: {
      firstName: refund.order.customer.firstName,
      lastName: refund.order.customer.lastName,
      email: refund.order.customer.email,
    },
    amount: Number(refund.amount),
    currency: refund.order.currency,
    status: refund.status,
    reason: refund.reason,
    aiClassification: refund.aiClassification,
    aiExplanation: refund.aiExplanation,
    policy: refund.policyResult,
    createdAt: refund.createdAt,
    updatedAt: refund.updatedAt,
    policyDecision: refund.policyDecision,
    reviewedAt: refund.reviewedAt,
    reviewNotes: refund.reviewNotes,
    reviewedByAdminId: refund.reviewedByAdminId,
  }));
}

export async function getRefundRequestById(id: string) {
  const refund = await prisma.refundRequest.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          orderNumber: true,
          itemName: true,
          currency: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      auditLogs: {
        orderBy: {
          createdAt: "asc",
        },
      },
      reviewedByAdmin: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!refund) {
    const error = new Error("Refund request not found.");
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  return {
    id: refund.id,
    orderNumber: refund.order.orderNumber,
    itemName: refund.order.itemName,
    customer: refund.order.customer,
    amount: Number(refund.amount),
    currency: refund.order.currency,
    status: refund.status,
    reason: refund.reason,
    aiClassification: refund.aiClassification,
    aiExplanation: refund.aiExplanation,
    policy: refund.policyResult,
    auditLogs: refund.auditLogs,
    createdAt: refund.createdAt,
    updatedAt: refund.updatedAt,
    reviewedByAdmin: refund.reviewedByAdmin,
  };
}

export interface ReviewRefundInput {
  refundRequestId: string;
  adminId: string;
  decision: "APPROVED" | "DENIED";
  reviewNotes: string;
}

export async function reviewRefundRequest(input: ReviewRefundInput) {
  const reviewNotes = input.reviewNotes.trim();

  if (reviewNotes.length < 5 || reviewNotes.length > 2000) {
    const error = new Error(
      "Review notes must be between 5 and 2000 characters.",
    );

    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  return prisma.$transaction(async (transaction) => {
    const existingRefund = await transaction.refundRequest.findUnique({
      where: {
        id: input.refundRequestId,
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            itemName: true,
            currency: true,
          },
        },
      },
    });

    if (!existingRefund) {
      const error = new Error("Refund request not found.");

      Object.assign(error, { statusCode: 404 });
      throw error;
    }

    // Only escalated requests can be manually reviewed.
    if (existingRefund.status !== "ESCALATED") {
      const error = new Error(
        "Only escalated refund requests can be reviewed.",
      );

      Object.assign(error, { statusCode: 409 });
      throw error;
    }

    const reviewedAt = new Date();

    const updatedRefund = await transaction.refundRequest.update({
      where: {
        id: existingRefund.id,
      },
      data: {
        status: input.decision,
        reviewedByAdminId: input.adminId,
        reviewedAt,
        reviewNotes,
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            itemName: true,
            currency: true,
          },
        },
        reviewedByAdmin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await transaction.auditLog.create({
      data: {
        refundRequestId: existingRefund.id,
        adminId: input.adminId,
        action: "REFUND_REQUEST_REVIEWED",
        details: {
          previousStatus: existingRefund.status,
          newStatus: input.decision,
          reviewNotes,
          reviewedAt: reviewedAt.toISOString(),
          adminId: input.adminId,
        },
      },
    });

    return {
      id: updatedRefund.id,
      orderNumber: updatedRefund.order.orderNumber,
      itemName: updatedRefund.order.itemName,
      amount: Number(updatedRefund.amount),
      currency: updatedRefund.order.currency,
      status: updatedRefund.status,
      reason: updatedRefund.reason,

      policyDecision: updatedRefund.policyDecision,
      policy: updatedRefund.policyResult,

      aiClassification: updatedRefund.aiClassification,
      aiExplanation: updatedRefund.aiExplanation,

      reviewedAt: updatedRefund.reviewedAt,
      reviewNotes: updatedRefund.reviewNotes,
      reviewedByAdmin: updatedRefund.reviewedByAdmin,

      createdAt: updatedRefund.createdAt,
      updatedAt: updatedRefund.updatedAt,
    };
  });
}