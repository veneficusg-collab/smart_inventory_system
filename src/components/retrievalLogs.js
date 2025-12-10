import React, { useEffect, useState } from "react";
import { Table, Button, Badge } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const RetrievalLogs = ({ staffId = "", limit = 20 }) => {
  const [retrievalLogs, setRetrievalLogs] = useState([]);
  const [loading, setLoading] = useState(false);
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
      // week starting Sunday
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

  const fetchRetrievalLogs = async (l = limit, p = period) => {
    setLoading(true);
    try {
      console.log("Fetching retrieval logs for staffId:", staffId, "with limit:", l, "period:", p);
      if (!staffId) {
        setRetrievalLogs([]);
        setLoading(false);
        return;
      }

      let q = supabase
        .from("main_retrievals")
        .select("id, staff_id, staff_name, items, retrieved_at, status")
        .eq("staff_id", staffId)
        .order("retrieved_at", { ascending: false })
        .limit(l);

      const { start, end } = computeRange(p);
      if (start && end) {
        q = q.gte("retrieved_at", start).lt("retrieved_at", end);
      }

      const { data, error } = await q;
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
    // re-fetch when staffId or period changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, period]);

  const renderItemsSummary = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) return "-";
    return items
      .map((it) => `${it.product_name || it.product_id} x${it.qty}`)
      .join(", ");
  };

  // Function to get status badge color and text
  const getStatusBadge = (status) => {
    if (!status) return <Badge bg="secondary">-</Badge>;
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('confirmed')) {
      return <Badge bg="success">{status}</Badge>;
    }
    
    if (statusLower.includes('declined') || statusLower.includes('rejected')) {
      return <Badge bg="danger">{status}</Badge>;
    }
    
    if (statusLower.includes('pending')) {
      return <Badge bg="warning" text="dark">{status}</Badge>;
    }
    
    // Default for other statuses
    return <Badge bg="secondary">{status}</Badge>;
  };

  return (
    <div className="d-flex justify-content-center" style={{ padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 1200 }}>
        <div className="bg-white m-0 rounded shadow-sm p-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <strong>My Recent Retrievals</strong>
            </div>
            <div className="d-flex align-items-center gap-2">
              <div className="me-2" style={{ display: "flex", gap: 6 }}>
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

              <Button
                size="sm"
                variant="outline-secondary"
                onClick={() => fetchRetrievalLogs(undefined, period)}
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="table-responsive">
            <Table striped bordered hover size="sm" className="mb-0">
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
                      No retrievals found for this staff
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
                          whiteSpace: "normal",
                          wordBreak: "break-word",
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
                      <td>
                        {getStatusBadge(r.status)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>

          {/* Status Legend */}
          <div className="mt-3 pt-3 border-top">
            <small className="text-muted">
              <strong>Status Legend:</strong>{" "}
              <Badge bg="success" className="ms-2 me-1">Confirmed</Badge>
              <Badge bg="danger" className="mx-1">Declined/Rejected</Badge>
              <Badge bg="warning" text="dark" className="mx-1">Pending</Badge>
              <Badge bg="secondary" className="mx-1">Other</Badge>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetrievalLogs;