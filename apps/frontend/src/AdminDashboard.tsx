import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CircleDollarSign,
  Clock3,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import "./AdminDashboard.css";
import api from "./lib/api";
import { useNavigate } from "react-router-dom";
import axios from "axios";


type RefundStatus = "APPROVED" | "DENIED" | "ESCALATED";

interface RefundRequest {
  id: string;
  orderNumber: string;
  itemName: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  amount: number;
  currency: string;
  status: RefundStatus;
  policyDecision?: RefundStatus | null;
  reason: string;
  aiClassification: string | null;
  aiExplanation: string | null;
  policy: {
    reason?: string;
    rulesTriggered?: string[];
    refundAmount?: number;
    currency?: string;
    requiresHumanReview?: boolean;
  } | null;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  reviewer?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = "ALL" | RefundStatus;

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function AdminDashboard() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(
    null,
  );
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "DENIED">(
    "APPROVED",
  );

  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

  const fetchRefunds = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/refunds");

      if (!response.data?.success || !Array.isArray(response.data.data)) {
        throw new Error("The server returned an unexpected response.");
      }

      setRefunds(response.data.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            "Unable to load refund requests. Check that the backend is running.",
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedRefund) return;

    const notes = reviewNotes.trim();

    if (notes.length < 5) {
      setReviewError("Please provide at least 5 characters of review notes.");
      return;
    }

    if (notes.length > 2000) {
      setReviewError("Review notes cannot exceed 2000 characters.");
      return;
    }

    setReviewSubmitting(true);
    setReviewError("");
    setReviewSuccess("");

    try {
      const response = await api.patch(`/refunds/${selectedRefund.id}/review`, {
        decision: reviewDecision,
        reviewNotes: notes,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to complete the review.",
        );
      }

      setReviewSuccess("Refund review completed successfully.");

      // Refresh the dashboard with the updated server data.
      await fetchRefunds();

      // Clear the review form after a successful submission.
      setReviewNotes("");
      setReviewDecision("APPROVED");

      // Keep the modal open so the administrator can see the result.
      const updatedRefund = response.data.data;

      if (updatedRefund) {
        setSelectedRefund((current) =>
          current?.id === updatedRefund.id
            ? {
                ...current,
                ...updatedRefund,
              }
            : current,
        );
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setReviewError(
          err.response?.data?.message ||
            "Unable to submit the review. Please try again.",
        );
      } else if (err instanceof Error) {
        setReviewError(err.message);
      } else {
        setReviewError("An unexpected error occurred.");
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  useEffect(() => {
    void fetchRefunds();
  }, []);

  const stats = useMemo(() => {
    const approved = refunds.filter((refund) => refund.status === "APPROVED");
    const denied = refunds.filter((refund) => refund.status === "DENIED");
    const escalated = refunds.filter((refund) => refund.status === "ESCALATED");

    const approvedValue = approved.reduce(
      (total, refund) => total + refund.amount,
      0,
    );

    return {
      total: refunds.length,
      approved: approved.length,
      denied: denied.length,
      escalated: escalated.length,
      approvedValue,
      currency: approved[0]?.currency || "USD",
    };
  }, [refunds]);

  const filteredRefunds = useMemo(() => {
    const query = search.toLowerCase().trim();

    return refunds.filter((refund) => {
      const matchesStatus =
        statusFilter === "ALL" || refund.status === statusFilter;

      const customerName =
        `${refund.customer.firstName} ${refund.customer.lastName}`.toLowerCase();

      const matchesSearch =
        !query ||
        refund.orderNumber.toLowerCase().includes(query) ||
        customerName.includes(query) ||
        refund.customer.email.toLowerCase().includes(query) ||
        refund.itemName.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [refunds, search, statusFilter]);

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore errors — we're clearing client-side state anyway
    }

    // Clear session from local storage
    localStorage.removeItem("refund_iq_admin_token");

    // Navigate to login with replace so the admin cannot go back
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <a href="/admin" className="admin-brand">
          <span className="admin-brand-icon">
            <ShieldCheck size={22} />
          </span>
          <span>
            Refund<span>IQ</span>
            <small>ADMIN CONSOLE</small>
          </span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          <a href="/admin" className="sidebar-link active">
            <LayoutDashboard size={18} />
            Dashboard
          </a>

          <button
            type="button"
            className="sidebar-link"
            onClick={() => {
              setStatusFilter("ALL");
              document
                .getElementById("refund-requests")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <FileText size={18} />
            Refund requests
            <span className="sidebar-count">{refunds.length}</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() => {
              setStatusFilter("ESCALATED");
              document
                .getElementById("refund-requests")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <Clock3 size={18} />
            Human review
            {stats.escalated > 0 && (
              <span className="sidebar-count">{stats.escalated}</span>
            )}
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-icon">
              <Activity size={18} />
            </div>
            <strong>RefundIQ is running</strong>
            <p>Connected to the refund management API.</p>
            <span className="connection-status">
              <span />
              API connection
            </span>
          </div>

          <a href="/" className="sidebar-link">
            <LayoutDashboard size={18} />
            Customer portal
          </a>

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>

          <div className="sidebar-user">
            <div className="user-avatar">AD</div>
            <div>
              <strong>Administrator</strong>
              <span>Authenticated admin</span>
            </div>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <div className="breadcrumb">Workspace / Dashboard</div>
            <h1>Refund overview</h1>
          </div>

          <div className="topbar-actions">
            <span className="admin-date">
              {new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </span>

            <button
              className="icon-button"
              type="button"
              aria-label="Refresh refund requests"
              onClick={() => void fetchRefunds()}
              disabled={loading}
            >
              {loading ? (
                <LoaderCircle className="admin-spin" size={19} />
              ) : (
                <RefreshCw size={19} />
              )}
            </button>

            <button
              className="icon-button notification-button"
              type="button"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={19} />
            </button>
          </div>
        </header>

        <section className="admin-welcome">
          <div>
            <h2>Good to see you, Admin.</h2>
            <p>Here's what's happening with your refund requests.</p>
          </div>

          <div className="welcome-badge">
            <Activity size={16} />
            Live overview
          </div>
        </section>

        {error && (
          <div className="admin-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void fetchRefunds()}
              aria-label="Retry loading refunds"
            >
              Retry
            </button>
          </div>
        )}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <span>Total requests</span>
              <span className="stat-icon green">
                <FileText size={19} />
              </span>
            </div>
            <div className="stat-number">{loading ? "—" : stats.total}</div>
            <div className="stat-foot">
              <span className="stat-neutral">
                <Activity size={14} />
                All submissions
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Approved</span>
              <span className="stat-icon blue">
                <ArrowUpRight size={19} />
              </span>
            </div>
            <div className="stat-number">{loading ? "—" : stats.approved}</div>
            <div className="stat-foot">
              <span className="stat-positive">
                <ArrowUpRight size={14} />
                Approved requests
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Needs review</span>
              <span className="stat-icon orange">
                <Clock3 size={19} />
              </span>
            </div>
            <div className="stat-number">{loading ? "—" : stats.escalated}</div>
            <div className="stat-foot">
              <span className="stat-warning">
                <Clock3 size={14} />
                Requires attention
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Approved value</span>
              <span className="stat-icon purple">
                <CircleDollarSign size={19} />
              </span>
            </div>
            <div className="stat-number stat-currency">
              {loading
                ? "—"
                : formatCurrency(stats.approvedValue, stats.currency)}
            </div>
            <div className="stat-foot">
              <span className="stat-neutral">
                <ArrowDownRight size={14} />
                Approved refund amounts
              </span>
            </div>
          </div>
        </section>

        <section className="refund-table-card" id="refund-requests">
          <div className="table-heading">
            <div>
              <h2>Refund requests</h2>
              <p>Review customer submissions and their policy outcomes.</p>
            </div>

            <button
              className="export-button"
              type="button"
              onClick={() => {
                const headers = [
                  "Order",
                  "Customer",
                  "Email",
                  "Item",
                  "Amount",
                  "Currency",
                  "Status",
                  "Classification",
                  "Date",
                ];

                const rows = filteredRefunds.map((refund) => [
                  refund.orderNumber,
                  `${refund.customer.firstName} ${refund.customer.lastName}`,
                  refund.customer.email,
                  refund.itemName,
                  refund.amount,
                  refund.currency,
                  refund.status,
                  refund.aiClassification || "N/A",
                  refund.createdAt,
                ]);

                const csv = [headers, ...rows]
                  .map((row) =>
                    row
                      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                      .join(","),
                  )
                  .join("\n");

                const blob = new Blob([csv], {
                  type: "text/csv;charset=utf-8;",
                });

                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "refundiq-refunds.csv";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              <ArrowDownRight size={17} />
              Export CSV
            </button>
          </div>

          <div className="table-toolbar">
            <div className="admin-search">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search orders, customers or items..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="filter-control">
              <SlidersHorizontal size={16} />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                aria-label="Filter by status"
              >
                <option value="ALL">All statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="DENIED">Denied</option>
                <option value="ESCALATED">Needs review</option>
              </select>
            </div>
          </div>

          <div className="table-scroll">
            <table className="refund-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Order / Item</th>
                  <th>Amount</th>
                  <th>AI classification</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="table-message">
                      <LoaderCircle className="admin-spin" size={22} />
                      Loading refund requests...
                    </td>
                  </tr>
                ) : filteredRefunds.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-message">
                      No refund requests match your search.
                    </td>
                  </tr>
                ) : (
                  filteredRefunds.map((refund) => (
                    <tr key={refund.id}>
                      <td>
                        <div className="customer-cell">
                          <div className="customer-avatar">
                            {getInitials(
                              refund.customer.firstName,
                              refund.customer.lastName,
                            )}
                          </div>
                          <div className="customer-details">
                            <strong>
                              {refund.customer.firstName}{" "}
                              {refund.customer.lastName}
                            </strong>
                            <span>{refund.customer.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="order-cell">
                          <strong>{refund.orderNumber}</strong>
                          <span>{refund.itemName}</span>
                        </div>
                      </td>

                      <td className="amount-cell">
                        {formatCurrency(refund.amount, refund.currency)}
                      </td>

                      <td>
                        <span className="classification">
                          {refund.aiClassification?.replace(/_/g, " ") ||
                            "Not classified"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-pill ${refund.status.toLowerCase()}`}
                        >
                          <span />
                          {refund.status === "ESCALATED"
                            ? "Needs review"
                            : refund.status.charAt(0) +
                              refund.status.slice(1).toLowerCase()}
                        </span>
                      </td>

                      <td className="date-cell">
                        {formatDate(refund.createdAt)}
                      </td>

                      <td>
                        <button
                          className="view-button"
                          type="button"
                          onClick={() => setSelectedRefund(refund)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-bottom">
            <span>
              Showing {filteredRefunds.length} of {refunds.length} requests
            </span>
            <button
              type="button"
              className="refresh-link"
              onClick={() => void fetchRefunds()}
              disabled={loading}
            >
              <RefreshCw size={14} />
              Refresh data
            </button>
          </div>
        </section>

        <footer className="admin-footer">
          <span>RefundIQ Admin Console</span>
          <span>
            <ShieldCheck size={14} />
            Internal dashboard preview
          </span>
        </footer>
      </main>

      {selectedRefund && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedRefund(null);
            }
          }}
        >
          <section
            className="refund-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-modal-title"
          >
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">REFUND DETAILS</span>
                <h2 id="refund-modal-title">{selectedRefund.orderNumber}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedRefund(null)}
                aria-label="Close refund details"
              >
                <X size={19} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-status-row">
                <span>Status</span>
                <span
                  className={`status-pill ${selectedRefund.status.toLowerCase()}`}
                >
                  <span />
                  {selectedRefund.status}
                </span>
              </div>

              <div className="modal-detail-grid">
                <div>
                  <span>Customer</span>
                  <strong>
                    {selectedRefund.customer.firstName}{" "}
                    {selectedRefund.customer.lastName}
                  </strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{selectedRefund.customer.email}</strong>
                </div>

                <div>
                  <span>Item</span>
                  <strong>{selectedRefund.itemName}</strong>
                </div>

                <div>
                  <span>Amount</span>
                  <strong>
                    {formatCurrency(
                      selectedRefund.amount,
                      selectedRefund.currency,
                    )}
                  </strong>
                </div>

                <div>
                  <span>AI classification</span>
                  <strong>
                    {selectedRefund.aiClassification?.replace(/_/g, " ") ||
                      "Not classified"}
                  </strong>
                </div>

                <div>
                  <span>Submitted</span>
                  <strong>{formatDate(selectedRefund.createdAt)}</strong>
                </div>
              </div>

              <div className="modal-section">
                <h3>Customer's reason</h3>
                <p>{selectedRefund.reason}</p>
              </div>

              <div className="modal-section">
                <h3>Policy assessment</h3>
                <p>
                  {selectedRefund.policy?.reason ||
                    "No policy explanation available."}
                </p>

                {selectedRefund.policy?.rulesTriggered &&
                  selectedRefund.policy.rulesTriggered.length > 0 && (
                    <div className="rule-tags">
                      {selectedRefund.policy.rulesTriggered.map((rule) => (
                        <span key={rule}>{rule}</span>
                      ))}
                    </div>
                  )}
              </div>

              <div className="modal-section ai-modal-section">
                <h3>
                  <Activity size={16} />
                  AI explanation
                </h3>
                <p>
                  {selectedRefund.aiExplanation ||
                    "No AI explanation is available for this request."}
                </p>
              </div>
            </div>

            <div className="modal-section review-history-section">
              <h3>
                <ShieldCheck size={16} />
                Review history
              </h3>

              <div className="review-history-row">
                <span>Original policy decision</span>
                <strong>
                  {selectedRefund.policyDecision ||
                    selectedRefund.policy?.reason ||
                    "Not available"}
                </strong>
              </div>

              {selectedRefund.reviewedAt && (
                <>
                  <div className="review-history-row">
                    <span>Reviewed by</span>
                    <strong>
                      {selectedRefund.reviewer
                        ? `${selectedRefund.reviewer.firstName} ${selectedRefund.reviewer.lastName}`
                        : selectedRefund.reviewedByAdminId || "Administrator"}
                    </strong>
                  </div>

                  <div className="review-history-row">
                    <span>Review date</span>
                    <strong>{formatDate(selectedRefund.reviewedAt)}</strong>
                  </div>

                  <div className="review-notes-display">
                    <span>Administrator's notes</span>
                    <p>
                      {selectedRefund.reviewNotes ||
                        "No review notes were recorded."}
                    </p>
                  </div>
                </>
              )}

              {!selectedRefund.reviewedAt && (
                <p className="review-empty">
                  No administrator review has been recorded for this request.
                </p>
              )}
            </div>

            {selectedRefund.status === "ESCALATED" && (
              <div className="modal-section review-form-section">
                <h3>
                  <ShieldCheck size={16} />
                  Administrator decision
                </h3>

                <p className="review-form-description">
                  Review the customer's request and policy assessment before
                  recording your decision. Your notes will be included in the
                  audit trail.
                </p>

                <div className="review-decision-options">
                  <label
                    className={`review-decision-option ${
                      reviewDecision === "APPROVED" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="reviewDecision"
                      value="APPROVED"
                      checked={reviewDecision === "APPROVED"}
                      onChange={() => {
                        setReviewDecision("APPROVED");
                        setReviewError("");
                      }}
                      disabled={reviewSubmitting}
                    />

                    <span>
                      <strong>Approve refund</strong>
                      <small>Approve this customer's refund request.</small>
                    </span>
                  </label>

                  <label
                    className={`review-decision-option ${
                      reviewDecision === "DENIED" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="reviewDecision"
                      value="DENIED"
                      checked={reviewDecision === "DENIED"}
                      onChange={() => {
                        setReviewDecision("DENIED");
                        setReviewError("");
                      }}
                      disabled={reviewSubmitting}
                    />

                    <span>
                      <strong>Deny refund</strong>
                      <small>Decline this customer's refund request.</small>
                    </span>
                  </label>
                </div>

                <label className="review-notes-label" htmlFor="reviewNotes">
                  Review notes <span>*</span>
                </label>

                <textarea
                  id="reviewNotes"
                  className="review-notes-input"
                  placeholder="Explain the reason for your decision..."
                  value={reviewNotes}
                  onChange={(event) => {
                    setReviewNotes(event.target.value);
                    setReviewError("");
                    setReviewSuccess("");
                  }}
                  minLength={5}
                  maxLength={2000}
                  rows={5}
                  disabled={reviewSubmitting}
                  required
                />

                <div className="review-notes-counter">
                  {reviewNotes.length}/2000 characters
                </div>

                {reviewError && (
                  <div className="review-feedback error" role="alert">
                    {reviewError}
                  </div>
                )}

                {reviewSuccess && (
                  <div className="review-feedback success" role="status">
                    {reviewSuccess}
                  </div>
                )}

                <button
                  type="button"
                  className={`submit-review-button ${
                    reviewDecision === "DENIED" ? "deny" : ""
                  }`}
                  onClick={() => void handleReviewSubmit()}
                  disabled={
                    reviewSubmitting ||
                    reviewNotes.trim().length < 5 ||
                    reviewNotes.trim().length > 2000
                  }
                >
                  {reviewSubmitting ? (
                    <>
                      <LoaderCircle className="admin-spin" size={17} />
                      Submitting review...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={17} />
                      Confirm{" "}
                      {reviewDecision === "APPROVED" ? "approval" : "denial"}
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="modal-close-button"
                onClick={() => setSelectedRefund(null)}
              >
                Close details
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
