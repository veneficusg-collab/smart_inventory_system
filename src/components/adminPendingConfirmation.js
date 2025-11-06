import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Spinner,
  Modal,
  Alert,
  Container,
} from "react-bootstrap";
import { supabase } from "../supabaseClient";

const AdminPendingConfirmations = () => {
  const [groups, setGroups] = useState([]); // grouped by retrieval_id
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const fetchPending = async () => {
    setLoading(true);
    setError("");
    try {
      // get waiting rows not yet confirmed by admin
      const { data, error } = await supabase
        .from("pharmacy_waiting")
        .select("*")
        .eq("admin_confirmed", false)
        .in("status", ["sold", "pharmacy_stock"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // group by retrieval_id
      const map = new Map();
      (data || []).forEach((row) => {
        const id = row.retrieval_id ?? "unknown";
        if (!map.has(id)) {
          map.set(id, {
            retrieval_id: id,
            secretary_id: row.secretary_id || null,
            secretary_name: row.secretary_name || null,
            created_at: row.created_at || null,
            items: [],
          });
        }
        map.get(id).items.push(row);
      });

      // convert to array ordered by created_at desc
      const arr = Array.from(map.values()).sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });

      setGroups(arr);
    } catch (e) {
      console.error("fetchPending", e);
      setError("Failed to load pending confirmations.");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openGroup = (g) => {
    setSelected(g);
    setShowModal(true);
  };

  const confirmGroup = async (retrievalId) => {
    setProcessingId(retrievalId);
    setError("");
    try {
      const now = new Date().toISOString();
      // 1) fetch waiting rows for this retrieval_id (still unconfirmed) so we can deduct stock
      const { data: waitingRows, error: fetchWaitErr } = await supabase
        .from("pharmacy_waiting")
        .select("*")
        .eq("retrieval_id", retrievalId)
        .eq("admin_confirmed", false);

      if (fetchWaitErr) throw fetchWaitErr;

      // 1.5) deduct quantity per item from products table
      if ((waitingRows[0].status === "pharmacy_stock") || (waitingRows[0].status === "sold")) {
        for (const item of waitingRows || []) {
          try {
            const deductQty = Number(item.qty ?? item.quantity ?? 0);
            if (!deductQty) continue;

            // try to find product row by common keys (id / product_id / product_uuid)
            let prod = null;

            // fallback: try matching on barcode/product_code column names commonly used
            if (!prod) {
              const { data: pByBarcode, error: pByBarcodeErr } = await supabase
                .from("main_stock_room_products")
                .select("*")
                .eq("product_ID", item.product_id)
                .limit(1);
              if (!pByBarcodeErr && pByBarcode && pByBarcode.length)
                prod = pByBarcode[0];
            }

            if (!prod) {
              console.warn(
                `Product not found for item ${item.product_id} / uuid=${item.product_uuid}`
              );
              continue;
            }

            // determine current quantity using common field names
            const currentQty = Number(prod.product_quantity ?? 0);

            const newQty = Math.max(0, currentQty - deductQty);

            const { error: updProdErr } = await supabase
              .from("main_stock_room_products")
              .update({
                product_quantity: newQty,
              })
              .eq("id", prod.id);
            if (updProdErr) {
              console.error(
                "Failed updating product qty for",
                prod.id,
                updProdErr
              );
            }
          } catch (innerErr) {
            console.error(
              "Error deducting product qty for item",
              item,
              innerErr
            );
          }
        }
      }

      // 1) mark pharmacy_waiting rows for this retrieval_id as admin_confirmed
      const { error: updWaitErr } = await supabase
        .from("pharmacy_waiting")
        .update({
          admin_confirmed: true,
        })
        .eq("retrieval_id", retrievalId);
      if (updWaitErr) throw updWaitErr;

      // 2) update main_retrievals status and admin_confirmed timestamp
      const { error: updMainErr } = await supabase
        .from("main_retrievals")
        .update({
          status: "admin_confirmed",
        })
        .eq("id", retrievalId);
      if (updMainErr)
        console.warn("main_retrievals update warning:", updMainErr);

      // 3) optionally notify secretary/staff
      const notif = {
        target_role: "secretary",
        title: `Retrieval ${retrievalId} confirmed by admin`,
        body: JSON.stringify({
          retrieval_id: retrievalId,
          confirmed_at: now,
        }),
        read: false,
      };
      const { error: notifErr } = await supabase
        .from("notifications")
        .insert([notif]);
      if (notifErr) console.warn("notification insert issue:", notifErr);

      // remove group from UI (re-render only)
      setGroups((prev) => prev.filter((g) => g.retrieval_id !== retrievalId));

      // close modal if the selected group was confirmed
      if (selected && selected.retrieval_id === retrievalId) {
        setShowModal(false);
        setSelected(null);
      }
    } catch (e) {
      console.error("confirmGroup", e);
      setError("Failed to confirm retrieval. See console.");
    } finally {
      setProcessingId(null);
    }
  };

   const declineGroup = async (retrievalId) => {
    setProcessingId(retrievalId);
    setError("");
    try {
      const now = new Date().toISOString();
      // 1) fetch waiting rows for this retrieval_id (still unconfirmed) so we can deduct stock
      const { data: waitingRows, error: fetchWaitErr } = await supabase
        .from("pharmacy_waiting")
        .select("*")
        .eq("retrieval_id", retrievalId)
        .eq("admin_confirmed", false);

      if (fetchWaitErr) throw fetchWaitErr;


      // 1) mark pharmacy_waiting rows for this retrieval_id as admin_confirmed
      const { error: updWaitErr } = await supabase
        .from("pharmacy_waiting")
        .update({
          admin_confirmed: true,
        })
        .eq("retrieval_id", retrievalId);
      if (updWaitErr) throw updWaitErr;

      // 2) update main_retrievals status and admin_confirmed timestamp
      const { error: updMainErr } = await supabase
        .from("main_retrievals")
        .update({
          status: "admin_declined",
        })
        .eq("id", retrievalId);
      if (updMainErr)
        console.warn("main_retrievals update warning:", updMainErr);

      // 3) optionally notify secretary/staff
      const notif = {
        target_role: "secretary",
        title: `Retrieval ${retrievalId} confirmed by admin`,
        body: JSON.stringify({
          retrieval_id: retrievalId,
          confirmed_at: now,
        }),
        read: false,
      };
      const { error: notifErr } = await supabase
        .from("notifications")
        .insert([notif]);
      if (notifErr) console.warn("notification insert issue:", notifErr);

      // remove group from UI (re-render only)
      setGroups((prev) => prev.filter((g) => g.retrieval_id !== retrievalId));

      // close modal if the selected group was confirmed
      if (selected && selected.retrieval_id === retrievalId) {
        setShowModal(false);
        setSelected(null);
      }
    } catch (e) {
      console.error("confirmGroup", e);
      setError("Failed to confirm retrieval. See console.");
    } finally {
      setProcessingId(null);
    }
  };
  return (
    <>
      <Container
        className="bg-white mx-4 my-4 rounded p-3"
        fluid
        style={{ width: "140vh" }}
      >
        <div className="mb-3 d-flex justify-content-between align-items-center">
          <div>
            <strong>Admin - Pending Confirmations</strong>
          </div>
          <div>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={fetchPending}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="p-3">
            <Spinner animation="border" /> Loading...
          </div>
        ) : (
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Retrieval ID</th>
                <th>Secretary</th>
                <th style={{ width: 360 }}>Items (summary)</th>
                <th style={{ width: 180 }}>Added</th>
                <th style={{ width: 180 }}>Status</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted">
                    No pending confirmations
                  </td>
                </tr>
              )}
              {groups.map((g) => (
                <tr key={g.retrieval_id}>
                  <td style={{ fontSize: 12 }}>{g.retrieval_id}</td>
                  <td>{g.secretary_name || g.secretary_id || "-"}</td>
                  <td
                    style={{
                      maxWidth: 360,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {(g.items || [])
                      .map(
                        (it) =>
                          `${it.product_name || it.product_id} x${
                            it.qty ?? it.quantity ?? 0
                          }`
                      )
                      .join(", ")}
                  </td>
                  <td>
                    {g.created_at
                      ? new Date(g.created_at).toLocaleString()
                      : "-"}
                  </td>
                  <td>{g.items[0].status}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openGroup(g)}
                      disabled={processingId === g.retrieval_id}
                    >
                      {processingId === g.retrieval_id
                        ? "View"
                        : "View"}
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => confirmGroup(g.retrieval_id)}
                      disabled={processingId === g.retrieval_id}
                    >
                      {processingId === g.retrieval_id
                        ? "Confirm"
                        : "Confirm"}
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => declineGroup(g.retrieval_id)}
                      disabled={processingId === g.retrieval_id}
                    >
                      {processingId === g.retrieval_id
                        ? "Decline"
                        : "Decline"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <Modal
          show={showModal}
          onHide={() => setShowModal(false)}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Pending Retrieval {selected ? `— ${selected.retrieval_id}` : ""}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {!selected ? (
              <div className="text-center text-muted">No selection</div>
            ) : (
              <>
                <div className="mb-2">
                  <strong>Secretary:</strong>{" "}
                  {selected.secretary_name || selected.secretary_id}
                </div>
                <div className="mb-3">
                  <strong>First Added:</strong>{" "}
                  {selected.created_at
                    ? new Date(selected.created_at).toLocaleString()
                    : "-"}
                </div>
                <Table size="sm" striped bordered>
                  <thead>
                    <tr>
                      <th>Barcode</th>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.items || []).map((it, idx) => (
                      <tr key={it.id ?? idx}>
                        <td>{it.product_id}</td>
                        <td>{it.product_name}</td>
                        <td>{it.qty ?? it.quantity ?? "-"}</td>
                        <td>{it.status || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
            <Button
              variant="success"
              onClick={() => selected && confirmGroup(selected.retrieval_id)}
              disabled={
                !selected ||
                processingId === (selected && selected.retrieval_id)
              }
            >
              {processingId === (selected && selected.retrieval_id)
                ? "Confirming..."
                : "Confirm Retrieval"}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
};

export default AdminPendingConfirmations;
