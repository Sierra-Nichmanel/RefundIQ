import { Order } from "@prisma/client";

export type RefundDecision = "APPROVED" | "DENIED" | "ESCALATED";

export interface RefundPolicyResult {
  decision: RefundDecision;
  reason: string;
  rulesTriggered: string[];
  refundAmount: number;
  currency: string;
  requiresHumanReview: boolean;
}

const REFUND_WINDOW_DAYS = 30;
const HUMAN_REVIEW_THRESHOLD = 500;

const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /ignore\s+your\s+rules/i,
  /bypass\s+(the\s+)?(policy|rules|restrictions)/i,
  /override\s+(the\s+)?(system|policy|instructions)/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /act\s+as\s+(an?\s+)?(admin|administrator)/i,
  /pretend\s+you\s+are\s+(the\s+)?(admin|administrator)/i,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/i,
];

function containsSuspiciousContent(reason: string): boolean {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(reason));
}

export function evaluateRefundPolicy(
  order: Order,
  reason: string,
): RefundPolicyResult {
  const refundAmount = Number(order.totalAmount);
  const currency = order.currency;

  const rulesTriggered: string[] = [];

  const orderDate = new Date(order.orderDate);
  const currentDate = new Date();

  const ageInDays = Math.floor(
    (currentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Rule 1: Final-sale items are never refundable.
  if (order.isFinalSale) {
    rulesTriggered.push("FINAL_SALE");

    return {
      decision: "DENIED",
      reason:
        "This item was marked as final sale and is not eligible for a refund.",
      rulesTriggered,
      refundAmount,
      currency,
      requiresHumanReview: false,
    };
  }

  // Rule 2: Orders older than 30 days are not eligible.
  if (ageInDays > REFUND_WINDOW_DAYS) {
    rulesTriggered.push("REFUND_WINDOW_EXCEEDED");

    return {
      decision: "DENIED",
      reason: "This order is outside the 30-day refund eligibility window.",
      rulesTriggered,
      refundAmount,
      currency,
      requiresHumanReview: false,
    };
  }

  // Rule 3: Suspicious instructions require human review.
  if (containsSuspiciousContent(reason)) {
    rulesTriggered.push("SUSPICIOUS_REQUEST");

    return {
      decision: "ESCALATED",
      reason:
        "This request requires additional review before a refund decision can be made.",
      rulesTriggered,
      refundAmount,
      currency,
      requiresHumanReview: true,
    };
  }

  // Rule 4: High-value refunds require human review.
  if (refundAmount > HUMAN_REVIEW_THRESHOLD) {
    rulesTriggered.push("HIGH_VALUE_REFUND");

    return {
      decision: "ESCALATED",
      reason: "Refund requests exceeding $500 require human review.",
      rulesTriggered,
      refundAmount,
      currency,
      requiresHumanReview: true,
    };
  }

  // Rule 5: Damaged or incorrect items qualify for a refund.
  const normalizedReason = reason.toLowerCase();

  const isDamaged =
    normalizedReason.includes("damaged") || normalizedReason.includes("broken");

  const isIncorrect =
    normalizedReason.includes("incorrect") ||
    normalizedReason.includes("wrong item") ||
    normalizedReason.includes("wrong product");

  if (isDamaged || isIncorrect) {
    rulesTriggered.push(isDamaged ? "DAMAGED_ITEM" : "INCORRECT_ITEM");

    return {
      decision: "APPROVED",
      reason:
        "The order is within the refund window and the reported item issue qualifies under the refund policy.",
      rulesTriggered,
      refundAmount,
      currency,
      requiresHumanReview: false,
    };
  }

  // Rule 6: Standard refund within the eligibility window.
  rulesTriggered.push("STANDARD_REFUND_ELIGIBLE");

  return {
    decision: "APPROVED",
    reason: "The order meets the standard refund eligibility requirements.",
    rulesTriggered,
    refundAmount,
    currency,
    requiresHumanReview: false,
  };
}
