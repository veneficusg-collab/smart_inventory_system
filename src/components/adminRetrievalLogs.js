import React, { useEffect, useState } from "react";
import { Table, Button, Container } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const AdminRetrievalLogs = () => {
  const [retrievalLogs, setRetrievalLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRetrievalLogs = async () => {
    setLoading(true);
    try {

      const { data, error } = await supabase
        .from("main_retrievals")
        .select(
          "id, staff_id, staff_name, items, retrieved_at, status"
        )
        .order("retrieved_at", { ascending: false })

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
    // re-fetch when staffId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => fetchRetrievalLogs()}
          >
            Refresh
          </Button>
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