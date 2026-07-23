import type { OrderReport } from "../types";
import { StatusBadge } from "./StatusBadge";

export function ReportTable({ report }: { report: OrderReport }) {
  const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";

  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Order Report</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Order ID</th>
            <th style={styles.th}>Total</th>
            <th style={styles.th}>Paid</th>
            <th style={styles.th}>Remaining</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {report.orders.map((o) => (
            <tr key={o.orderId} style={styles.tr}>
              <td style={styles.td}>{o.orderId.slice(0, 12)}...</td>
              <td style={styles.td}>{fmt(o.totalAmount)}</td>
              <td style={styles.td}>{fmt(o.paidAmount)}</td>
              <td style={styles.td}>{fmt(o.remaining)}</td>
              <td style={styles.td}>
                <StatusBadge status={o.status} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={styles.totalRow}>
            <td style={styles.td}>
              <strong>TOTALS</strong>
            </td>
            <td style={styles.td}>
              <strong>{fmt(report.totals.totalAmount)}</strong>
            </td>
            <td style={styles.td}>
              <strong>{fmt(report.totals.totalPaid)}</strong>
            </td>
            <td style={styles.td}>
              <strong>{fmt(report.totals.totalRemaining)}</strong>
            </td>
            <td style={styles.td}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff",
    borderRadius: 8,
    padding: 24,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    flex: 1,
    overflowX: "auto",
  },
  heading: { marginTop: 0, marginBottom: 16, fontSize: "1.2rem" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    borderBottom: "2px solid #e0e0e0",
    fontSize: "0.85rem",
    color: "#666",
  },
  tr: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "10px 12px", fontSize: "0.9rem" },
  totalRow: {
    background: "#f5f5f5",
    borderTop: "2px solid #e0e0e0",
  },
};
