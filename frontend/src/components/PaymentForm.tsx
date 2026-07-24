import { useState, useEffect } from "react";
import { addPayment } from "../services/api";
import type { OrderReportRow, PaymentResponse } from "../types";

const generateIdempotencyKey = (): string => crypto.randomUUID();

interface Props {
  orders: OrderReportRow[];
  onPaymentSuccess: () => void;
}

export function PaymentForm({ orders, onPaymentSuccess }: Props) {
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [result, setResult] = useState<PaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate fresh idempotency key when order changes
  useEffect(() => {
    setIdempotencyKey(generateIdempotencyKey());
  }, [orderId]);

  // Find selected order to show remaining balance
  const selectedOrder = orders.find((o) => o.orderId === orderId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !amount) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await addPayment({
        orderId,
        amount: parseFloat(amount),
        idempotencyKey,
      });
      setResult(res);
      onPaymentSuccess(); // refresh report
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as {
          response?: { data?: { message?: string }; status?: number };
        };
        setError(
          axiosErr.response?.data?.message || `Error ${axiosErr.response?.status}`
        );
      } else {
        setError("Network error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Add Payment</h2>

      <form onSubmit={handleSubmit}>
        <div style={styles.field}>
          <label style={styles.label}>Order</label>
          <select
            value={orderId}
            onChange={(e) => {
              setOrderId(e.target.value);
              setResult(null);
              setError(null);
            }}
            style={styles.select}
          >
            <option value="">-- Select order --</option>
            {orders.map((o) => (
              <option key={o.orderId} value={o.orderId}>
                {o.orderId.slice(0, 8)}... —{" "}
                {o.totalAmount.toLocaleString()} ₽ ({o.status})
              </option>
            ))}
          </select>
        </div>

        {selectedOrder && (
          <div style={styles.info}>
            Remaining: {selectedOrder.remaining.toLocaleString()} ₽ /{" "}
            {selectedOrder.totalAmount.toLocaleString()} ₽
          </div>
        )}

        <div style={styles.field}>
          <label style={styles.label}>Amount (₽)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setResult(null);
              setError(null);
            }}
            style={styles.input}
            placeholder="5000.00"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Idempotency Key (auto-generated)</label>
          <input
            type="text"
            value={idempotencyKey}
            readOnly
            style={{ ...styles.input, background: "#f5f5f5", color: "#888" }}
          />
          <button
            type="button"
            onClick={() => setIdempotencyKey(generateIdempotencyKey())}
            style={styles.regenerateBtn}
          >
            Regenerate
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !orderId || !amount}
          style={{
            ...styles.submitBtn,
            opacity: loading || !orderId || !amount ? 0.6 : 1,
          }}
        >
          {loading ? "Processing..." : "Submit Payment"}
        </button>
      </form>

      {result && (
        <div style={styles.successBox}>
          <strong>Payment recorded!</strong>
          <br />
          Payment ID: {result.paymentId.slice(0, 8)}...
          <br />
          Status: {result.orderStatus} | Remaining:{" "}
          {result.remainingBalance?.toLocaleString() ?? "—"} ₽
        </div>
      )}

      {error && <div style={styles.errorBox}>{error}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff",
    borderRadius: 8,
    padding: 24,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    maxWidth: 480,
  },
  heading: { marginTop: 0, marginBottom: 20, fontSize: "1.2rem" },
  field: { marginBottom: 16 },
  label: { display: "block", marginBottom: 4, fontWeight: 600, fontSize: "0.85rem" },
  select: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: "0.95rem",
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: "0.95rem",
    boxSizing: "border-box",
  },
  info: {
    marginBottom: 16,
    padding: "8px 12px",
    background: "#f0f4ff",
    borderRadius: 6,
    fontSize: "0.9rem",
  },
  submitBtn: {
    width: "100%",
    padding: "10px 0",
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
  },
  regenerateBtn: {
    marginTop: 6,
    padding: "4px 12px",
    background: "transparent",
    color: "#1976d2",
    border: "1px solid #1976d2",
    borderRadius: 4,
    fontSize: "0.8rem",
    cursor: "pointer",
  },
  successBox: {
    marginTop: 16,
    padding: 12,
    background: "#e8f5e9",
    border: "1px solid #a5d6a7",
    borderRadius: 6,
    fontSize: "0.9rem",
    lineHeight: 1.6,
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    background: "#ffebee",
    border: "1px solid #ef9a9a",
    borderRadius: 6,
    color: "#c62828",
    fontSize: "0.9rem",
  },
};
