// ...existing code...
import React, { useEffect, useState } from "react";
import { Table, Button, Container } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const AdminRetrievalLogs = () => {
  const [retrievalLogs, setRetrievalLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  // new: period toggle
  const [period, setPeriod] = useState("daily"); // "daily" | "weekly" | "monthly" | "all"

  const computeRange = (p) => {
    const now = new Date();
    if (p === "daily") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (p === "weekly") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (p === "monthly") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    return { start: null, end: null };
  };

  const fetchRetrievalLogs = async (p = period) => {
    setLoading(true);
    try {
      let q = supabase
        .from("main_retrievals")
        .select("id, staff_id, staff_name, items, retrieved_at, status")
        .order("retrieved_at", { ascending: false });

      const { start, end } = computeRange(p);
      if (start && end) {
        q = q.gte("retrieved_at", start).lt("retrieved_at", end);
      }

      const { data, error } = await q;
      console.log("Retrieved data:", data);
      if (error) throw error;
      setRetrievalLogs(data || []);
    } catch (e) {
      console.error("fetchRetrievalLogs", e);
      setRetrievalLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetrievalLogs();
    // re-fetch when period changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const renderItemsSummary = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) return "-";
    return items
      .map((it) => `${it.product_name || it.product_id} x${it.qty}`)
      .join(", ");
  };

  return (
    <Container
      fluid
      className="bg-white m-4 rounded p-4"
      style={{ width: "140vh", height: "50vh", overflowY: "auto" }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <strong>Retrievals Logs</strong>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div style={{ display: "flex", gap: 6 }}>
            <Button
              size="sm"
              variant={period === "daily" ? "primary" : "outline-secondary"}
              onClick={() => setPeriod("daily")}
              aria-pressed={period === "daily"}
            >
              Daily
            </Button>
            <Button
              size="sm"
              variant={period === "weekly" ? "primary" : "outline-secondary"}
              onClick={() => setPeriod("weekly")}
              aria-pressed={period === "weekly"}
            >
              Weekly
            </Button>
            <Button
              size="sm"
              variant={period === "monthly" ? "primary" : "outline-secondary"}
              onClick={() => setPeriod("monthly")}
              aria-pressed={period === "monthly"}
            >
              Monthly
            </Button>
            <Button
              size="sm"
              variant={period === "all" ? "primary" : "outline-secondary"}
              onClick={() => setPeriod("all")}
              aria-pressed={period === "all"}
            >
              All
            </Button>
          </div>
          <div>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => fetchRetrievalLogs(period)}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th style={{ width: 180 }}>Retrieval ID</th>
            <th>Staff</th>
            <th>Items</th>
            <th style={{ width: 180 }}>Retrieved At</th>
            <th style={{ width: 120 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan="5" className="text-center text-muted">
                Loading...
              </td>
            </tr>
          )}

          {!loading && retrievalLogs.length === 0 && (
            <tr>
              <td colSpan="5" className="text-center text-muted">
                No retrievals found for this period
              </td>
            </tr>
          )}

          {!loading &&
            retrievalLogs.map((r) => (
              <tr key={r.id}>
                <td style={{ fontSize: 12 }}>{r.id}</td>
                <td>{r.staff_name || r.staff_id}</td>
                <td
                  style={{
                    maxWidth: 400,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {renderItemsSummary(r.items)}
                </td>
                <td>
                  {r.retrieved_at_local
                    ? r.retrieved_at_local
                    : r.retrieved_at
                    ? new Date(r.retrieved_at).toLocaleString()
                    : "-"}
                </td>
                <td>{r.status || "-"}</td>
              </tr>
            ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default AdminRetrievalLogs;
// ...existing code...