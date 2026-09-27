import { useState } from "react";
import axios from "axios";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Headphones,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface RefundResponse {
  id: string;
  orderNumber: string;
  itemName: string;
  amount: number;
  currency: string;
  status: "APPROVED" | "DENIED" | "ESCALATED";
  reason: string;
  aiClassification: string;
  aiExplanation: string;
  createdAt: string;
}

function App() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refund, setRefund] = useState<RefundResponse | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setRefund(null);

    try {
      const response = await axios.post<{
        success: boolean;
        message: string;
        data: RefundResponse;
      }>(`${API_URL}/refunds`, {
        orderNumber: orderNumber.trim(),
        customerEmail: email.trim(),
        reason: reason.trim(),
      });

      const refundData = response.data?.data;

      if (!refundData || !refundData.id) {
        console.error("Unexpected refund API response:", response.data);
        setError("The refund was submitted, but the response was incomplete.");
        return;
      }

      console.log("Refund response:", refundData);

      setRefund(refundData);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Unable to submit your refund request. Please try again.",
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOrderNumber("");
    setEmail("");
    setReason("");
    setRefund(null);
    setError("");
  };

  const statusLabel: Record<RefundResponse["status"], string> = {
    APPROVED: "Approved",
    DENIED: "Declined",
    ESCALATED: "Under review",
  };

  return (
    <div className="app">
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-icon">
            <Sparkles size={21} />
          </span>
          <span>
            Refund<span className="brand-accent">IQ</span>
          </span>
        </a>

        <div className="header-right">
          <span className="secure-label">
            <ShieldCheck size={15} />
            Secure support
          </span>
          <button className="support-button" type="button">
            <Headphones size={17} />
            <span>Help center</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="eyebrow">
            <span className="online-dot" />
            AI-POWERED CUSTOMER SUPPORT
          </div>

          <h1>
            Refunds made
            <br />
            <span>simple.</span>
          </h1>

          <p className="hero-description">
            Tell us what happened with your order. Our intelligent refund
            assistant will review your request and help you find a resolution.
          </p>

          <div className="trust-points">
            <span>
              <CheckCircle2 size={16} />
              Quick assessment
            </span>
            <span>
              <ShieldCheck size={16} />
              Secure process
            </span>
          </div>
        </section>

        <section className="chat-card">
          <div className="chat-header">
            <div className="assistant-avatar">
              <Bot size={23} />
              <span className="avatar-online" />
            </div>

            <div className="assistant-info">
              <h2>Refund Assistant</h2>
              <p>
                <span className="online-dot" />
                Here to help you
              </p>
            </div>

            <span className="ai-badge">
              <Sparkles size={13} />
              AI
            </span>
          </div>

          <div className="chat-body">
            {!refund ? (
              <>
                <div className="message-row">
                  <div className="message-avatar">
                    <Bot size={18} />
                  </div>

                  <div className="message-content">
                    <div className="message-bubble">
                      Hi there! I'm your RefundIQ assistant. I'm here to help
                      you with your refund request.
                      <br />
                      <br />
                      Please provide your order details and tell me what
                      happened. I'll review your request against our refund
                      policy.
                    </div>
                    <span className="message-time">RefundIQ Assistant</span>
                  </div>
                </div>

                <form className="refund-form" onSubmit={handleSubmit}>
                  <div className="form-heading">
                    <span className="step-number">1</span>
                    <div>
                      <h3>Your order details</h3>
                      <p>Enter the details associated with your purchase.</p>
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="orderNumber">Order number</label>
                    <input
                      id="orderNumber"
                      type="text"
                      placeholder="e.g. RFQ-001-01"
                      value={orderNumber}
                      onChange={(event) => setOrderNumber(event.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="email">Email address</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                    <span className="field-hint">
                      Use the email address associated with your order.
                    </span>
                  </div>

                  <div className="form-heading reason-heading">
                    <span className="step-number">2</span>
                    <div>
                      <h3>Tell us what happened</h3>
                      <p>Explain why you'd like to request a refund.</p>
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="reason">Reason for refund</label>
                    <textarea
                      id="reason"
                      placeholder="For example: My headphones arrived damaged..."
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={4}
                      maxLength={2000}
                      required
                    />
                    <span className="character-count">
                      {reason.length}/2000
                    </span>
                  </div>

                  {error && (
                    <div className="error-message" role="alert">
                      {error}
                    </div>
                  )}

                  <button
                    className="submit-button"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <LoaderCircle className="spin" size={19} />
                        Reviewing your request...
                      </>
                    ) : (
                      <>
                        Submit refund request
                        <ArrowUpRight size={19} />
                      </>
                    )}
                  </button>

                  <p className="form-disclaimer">
                    Your request will be evaluated against the applicable refund
                    policy. Some requests may require human review.
                  </p>
                </form>
              </>
            ) : (
              <div className="result-section">
                <div className="result-icon">
                  <CheckCircle2 size={30} />
                </div>

                <h2>Request submitted</h2>
                <p className="result-description">
                  Your refund request has been evaluated. Here are the details
                  of the assessment.
                </p>

                <div className="result-status">
                  <span>Status</span>
                  <strong
                    className={`status-${(refund.status ?? "ESCALATED").toLowerCase()}`}
                  >
                    {statusLabel[refund.status]}
                  </strong>
                </div>

                <div className="result-details">
                  <div>
                    <span>Request ID</span>
                    <strong>{refund.id}</strong>
                  </div>

                  <div>
                    <span>Order number</span>
                    <strong>{refund.orderNumber}</strong>
                  </div>

                  <div>
                    <span>Item</span>
                    <strong>{refund.itemName}</strong>
                  </div>

                  <div>
                    <span>Refund amount</span>
                    <strong>
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: refund.currency,
                      }).format(refund.amount)}
                    </strong>
                  </div>
                </div>

                <div className="ai-explanation">
                  <div className="explanation-heading">
                    <Sparkles size={17} />
                    Assessment explanation
                  </div>
                  <p>{refund.aiExplanation}</p>
                </div>

                <button
                  className="submit-button"
                  onClick={resetForm}
                  type="button"
                >
                  Submit another request
                  <ArrowUpRight size={19} />
                </button>
              </div>
            )}
          </div>

          <div className="chat-footer">
            <ShieldCheck size={15} />
            Your information is processed securely.
          </div>
        </section>

        <footer className="page-footer">
          <p>© 2026 RefundIQ. Intelligent refund management.</p>
          <div>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
