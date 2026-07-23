import type { OrderStatus } from "../types";

const STATUS_STYLES: Record<OrderStatus, React.CSSProperties> = {
  pending: { background: "#fff3e0", color: "#e65100", border: "1px solid #ffcc80" },
  partially_paid: { background: "#e3f2fd", color: "#0d47a1", border: "1px solid #90caf9" },
  paid: { background: "#e8f5e9", color: "#1b5e20", border: "1px solid #a5d6a7" },
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  partially_paid: "Partially Paid",
  paid: "Paid",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      style={{
        ...STATUS_STYLES[status],
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: "0.8rem",
        fontWeight: 600,
        display: "inline-block",
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
