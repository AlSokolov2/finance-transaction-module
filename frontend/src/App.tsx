import { useEffect, useState, useCallback } from "react";
import type { OrderReport } from "./types";
import { getReport } from "./services/api";
import { PaymentForm } from "./components/PaymentForm";
import { ReportTable } from "./components/ReportTable";

export default function App() {
  const [report, setReport] = useState<OrderReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      const data = await getReport();
      setReport(data);
      setError(null);
    } catch {
      setError("Failed to load report. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return <div style={styles.centered}>Loading...</div>;
  }

  if (error || !report) {
    return <div style={{ ...styles.centered, color: "#c62828" }}>{error}</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Finance Transaction Module</h1>
      </header>

      <main style={styles.main}>
        <PaymentForm
          orders={report.orders}
          onPaymentSuccess={fetchReport}
        />
        <ReportTable report={report} />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    minHeight: "100vh",
    background: "#f8f9fa",
  },
  header: {
    background: "#fff",
    borderBottom: "1px solid #e0e0e0",
    padding: "16px 32px",
  },
  title: {
    margin: 0,
    fontSize: "1.3rem",
    fontWeight: 700,
  },
  main: {
    padding: 32,
    display: "flex",
    gap: 32,
    alignItems: "flex-start",
    flexWrap: "wrap" as const,
  },
  centered: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    fontSize: "1.1rem",
  },
};
