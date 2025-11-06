import React, { useEffect, useState } from "react";
import { Table, Button, Spinner, Modal, Alert, Container } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const ConfirmedRetrievals = ({ staffId = "", staffName = "", limit = 50 }) => {
  const [rows, setRows] = useState([]); // list of main_retrievals
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null); // selected retrieval for modal
  const [showModal, setShowModal] = useState(false);

  const fetchConfirmedRetrievals = async (l = limit) => {
    setError("");
    setLoading(true);
    try {
      // 1) get waiting rows confirmed by this secretary (or any secretary if staffId not provided)
      let query = supabase
        .from("pharmacy_waiting")
        .select("retrieval_id, created_at")
        .eq("secretary_confirmed", true)
        .order("created_at", { ascending: false })
        .limit(l);

      if (staffId) query = query.eq("secretary_id", staffId);

      const { data: waiting, error: waitErr } = await query;
      if (waitErr) throw waitErr;

      const retrievalIds = Array.from(new Set((waiting || []).map((w) => w.retrieval_id))).filter(Boolean);
      if (retrievalIds.length === 0) {
        setRows([]);
        return;
      }

      // 2) fetch the main_retrievals for those ids (latest first)
      const { data: retrievals, error: retErr } = await supabase
        .from("main_retrievals")
        .select("id, staff_id, staff_name, items, retrieved_at, status, secretary_processed")
        .in("id", retrievalIds)
        .order("retrieved_at", { ascending: false })
        .limit(l);

      if (retErr) throw retErr;

      // keep order by retrieved_at descending
      setRows(retrievals || []);
    } catch (e) {
      console.error("fetchConfirmedRetrievals", e);
      setError("Failed to load confirmed retrievals.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfirmedRetrievals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  const handleRowClick = (r) => {
    setSelected(r);
    setShowModal(true);
  };

  const renderItems = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) return <div className="text-muted">No items</div>;
    return (
      <Table size="sm" striped bordered>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.product_id ?? idx}>
              <td>{it.product_id}</td>
              <td>{it.product_name}</td>
              <td>{it.qty ?? it.quantity ?? "-"}</td>
              <td>{it.unit ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <>
     <Container
        fluid
        className="bg-white m-4 p-3 rounded"
        style={{ width: "140vh" }}
      >
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <div><strong>Confirmed Retrievals</strong></div>
        <div>
          <Button size="sm" variant="outline-secondary" onClick={() => fetchConfirmedRetrievals()}>
            Refresh
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <div className="p-3"><Spinner animation="border" /> Loading...</div>
      ) : (
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th style={{ width: 180 }}>Retrieval ID</th>
              <th>Staff</th>
              <th style={{ width: 360 }}>Items (summary)</th>
              <th style={{ width: 180 }}>Retrieved At</th>
              <th style={{ width: 140 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-muted">No confirmed retrievals found</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => handleRowClick(r)}>
                <td style={{ fontSize: 12 }}>{r.id}</td>
                <td>{r.staff_name || r.staff_id}</td>
                <td style={{ maxWidth: 360, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {(r.items || []).map((it) => `${it.product_name || it.product_id} x${it.qty ?? it.quantity ?? 0}`).join(", ")}
                </td>
                <td>{r.retrieved_at ? new Date(r.retrieved_at).toLocaleString() : "-"}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Retrieval Details {selected ? `— ${selected.id}` : ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!selected ? (
            <div className="text-center text-muted">No selection</div>
          ) : (
            <>
              <div className="mb-2"><strong>Staff:</strong> {selected.staff_name || selected.staff_id}</div>
              <div className="mb-2"><strong>Retrieved At:</strong> {selected.retrieved_at ? new Date(selected.retrieved_at).toLocaleString() : "-"}</div>
              <div className="mb-3"><strong>Status:</strong> {selected.status || "-"}</div>
              <div>
                <strong>Items</strong>
                {renderItems(selected.items)}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
      </Container>
    </>
  );
};

export default ConfirmedRetrievals;