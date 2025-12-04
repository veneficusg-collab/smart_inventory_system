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
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [processingAll, setProcessingAll] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("pharmacy_waiting")
        .select("*")
        .eq("admin_confirmed", false)
        .in("status", ["sold", "pharmacy_stock"])
        .order("created_at", { ascending: false });

      if (error) throw error;

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
            staff_name: null,
          });
        }
        map.get(id).items.push(row);
      });

      const arr = Array.from(map.values()).sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });

      const retrievalIds = arr.map((g) => g.retrieval_id).filter(Boolean);
      if (retrievalIds.length > 0) {
        const { data: mainRows, error: mainErr } = await supabase
          .from("main_retrievals")
          .select("id, staff_name")
          .in("id", retrievalIds);
        if (!mainErr && mainRows) {
          const mapStaff = new Map(
            (mainRows || []).map((r) => [String(r.id), r.staff_name])
          );
          arr.forEach((g) => {
            g.staff_name = mapStaff.get(String(g.retrieval_id)) || null;
          });
        }
      }

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

  const _deductProductsForItems = async (items) => {
    for (const item of items || []) {
      try {
        const deductQty = Number(item.qty ?? item.quantity ?? 0);
        if (!deductQty) continue;

        const { data: pByBarcode, error: pByBarcodeErr } = await supabase
          .from("main_stock_room_products")
          .select("*")
          .eq("product_ID", item.product_id)
          .eq("product_expiry", item.product_expiry) // Match expiry date
          .order("product_expiry", { ascending: true }); // Ensure we get the oldest stock first

        if (pByBarcodeErr) {
          console.error("product lookup error", pByBarcodeErr);
          continue;
        }

        let remainingQty = deductQty;
        for (const prod of pByBarcode || []) {
          if (remainingQty <= 0) break;

          const currentQty = Number(prod.product_quantity ?? 0);
          const deductFromThisQty = Math.min(currentQty, remainingQty); // Deduct the lesser of the current stock or remaining quantity
          const newQty = Math.max(0, currentQty - deductFromThisQty);

          const { error: updProdErr } = await supabase
            .from("main_stock_room_products")
            .update({ product_quantity: newQty })
            .eq("id", prod.id);

          if (updProdErr) {
            console.error(
              "Failed updating product qty for",
              prod.id,
              updProdErr
            );
          } else {
            console.log(
              `✅ Deducted ${deductFromThisQty} from Main Stock Room: ${item.product_name}`
            );
          }

          remainingQty -= deductFromThisQty; // Reduce remaining quantity to deduct
        }

        if (remainingQty > 0) {
          console.warn(
            `Not enough stock to deduct for ${item.product_name}. Remaining: ${remainingQty}`
          );
        }
      } catch (innerErr) {
        console.error("Error deducting product qty for item", item, innerErr);
      }
    }
  };

  const _AddProductsForItems = async (items) => {
    for (const item of items || []) {
      try {
        const addQty = Number(item.qty ?? item.quantity ?? 0);
        if (!addQty) continue;

        // Ensure product_expiry is defined
        if (!item.product_expiry) {
          console.error("product_expiry is undefined for item", item);
          continue; // Skip this item if the expiry date is missing
        }

        // Check if product exists in pharmacy with the same expiry date
        const { data: pByBarcode, error: pByBarcodeErr } = await supabase
          .from("products")
          .select("*")
          .eq("product_ID", item.product_id)
          .eq("product_expiry", item.product_expiry) // Match expiry date
          .limit(1);

        if (pByBarcodeErr) {
          console.error("product lookup error", pByBarcodeErr);
          continue;
        }

        const prod = (pByBarcode && pByBarcode.length && pByBarcode[0]) || null;

        if (!prod) {
          // Product doesn't exist in pharmacy with the same expiry date, create it
          console.warn(
            `Product not found in Pharmacy with expiry ${item.product_expiry}, Creating: ${item.product_id}`
          );

          const { data: main_stock_room_products, error: mainError } =
            await supabase
              .from("main_stock_room_products")
              .select("*")
              .eq("product_ID", item.product_id)
              .limit(1);

          if (mainError) {
            console.error("product lookup error in main stock room", mainError);
            continue;
          }

          if (
            !main_stock_room_products ||
            main_stock_room_products.length === 0
          ) {
            console.error(
              `Product ${item.product_id} not found in main stock room either!`
            );
            continue;
          }

          const product = main_stock_room_products[0];

          // Insert product into the pharmacy table
          const { error: insertError } = await supabase
            .from("products")
            .insert([
              {
                product_ID: product.product_ID,
                product_name: product.product_name,
                product_quantity: addQty,
                product_price: product.product_price,
                product_unit: product.product_unit,
                product_category: product.product_category,
                product_expiry: product.product_expiry, // Insert the correct expiry date
                product_img: product.product_img,
                supplier_name: product.supplier_name,
                supplier_number: product.supplier_number,
                product_brand: product.product_brand,
                supplier_price: product.supplier_price,
                vat: product.vat,
              },
            ]);

          if (insertError) {
            console.error("Failed creating product in Pharmacy", insertError);
          } else {
            console.log(
              `✅ Created product in Pharmacy: ${product.product_name} with qty ${addQty} and expiry ${item.product_expiry}`
            );
          }
        } else {
          // Product exists, update quantity for the same expiry date
          const currentQty = Number(prod.product_quantity ?? 0);
          const newQty = currentQty + addQty;

          const { error: updProdErr } = await supabase
            .from("products")
            .update({ product_quantity: newQty })
            .eq("id", prod.id);

          if (updProdErr) {
            console.error(
              "Failed updating product qty for",
              prod.id,
              updProdErr
            );
          } else {
            console.log(
              `✅ Added ${addQty} to Pharmacy for ${item.product_name} (new qty: ${newQty}) with expiry ${item.product_expiry}`
            );
          }
        }
      } catch (innerErr) {
        console.error("Error adding product qty for item", item, innerErr);
      }
    }
  };

  // ✅ FIXED: Single confirmation now includes both deduct AND add
  const confirmGroup = async (retrievalId) => {
    setProcessingId(retrievalId);
    setError("");
    setSuccess("");
    try {
      const now = new Date().toISOString();
      const { data: waitingRows, error: fetchWaitErr } = await supabase
        .from("pharmacy_waiting")
        .select("*")
        .eq("retrieval_id", retrievalId)
        .eq("admin_confirmed", false);

      if (fetchWaitErr) throw fetchWaitErr;

      // ✅ Step 1: Deduct from Main Stock Room
      await _deductProductsForItems(waitingRows);

      // ✅ Step 2: Add to Pharmacy
      await _AddProductsForItems(waitingRows);

      // ✅ Step 3: Update pharmacy_waiting table
      const { error: updWaitErr } = await supabase
        .from("pharmacy_waiting")
        .update({ admin_confirmed: true })
        .eq("retrieval_id", retrievalId);
      if (updWaitErr) throw updWaitErr;

      // ✅ Step 4: Update main_retrievals status
      const { error: updMainErr } = await supabase
        .from("main_retrievals")
        .update({ status: "admin_confirmed" })
        .eq("id", retrievalId);
      if (updMainErr)
        console.warn("main_retrievals update warning:", updMainErr);

      // ✅ Step 5: Send notification
      const notif = {
        target_role: "secretary",
        title: `Retrieval ${retrievalId} confirmed by admin`,
        body: JSON.stringify({ retrieval_id: retrievalId, confirmed_at: now }),
        read: false,
      };
      const { error: notifErr } = await supabase
        .from("notifications")
        .insert([notif]);
      if (notifErr) console.warn("notification insert issue:", notifErr);

      setGroups((prev) => prev.filter((g) => g.retrieval_id !== retrievalId));
      if (selected && selected.retrieval_id === retrievalId) {
        setShowModal(false);
        setSelected(null);
      }
      setSuccess(`Retrieval ${retrievalId} confirmed successfully!`);
    } catch (e) {
      console.error("confirmGroup", e);
      setError("Failed to confirm retrieval. See console.");
    } finally {
      setProcessingId(null);
    }
  };

  const confirmAll = async () => {
    if (!groups || groups.length === 0) return;
    setProcessingAll(true);
    setError("");
    setSuccess("");
    try {
      const now = new Date().toISOString();
      const failed = [];
      for (const g of groups) {
        try {
          const { data: waitingRows, error: fetchWaitErr } = await supabase
            .from("pharmacy_waiting")
            .select("*")
            .eq("retrieval_id", g.retrieval_id)
            .eq("admin_confirmed", false);
          if (fetchWaitErr) throw fetchWaitErr;

          // Deduct from Main Stock Room
          await _deductProductsForItems(waitingRows);

          // Add to Pharmacy
          await _AddProductsForItems(waitingRows);

          const { error: updWaitErr } = await supabase
            .from("pharmacy_waiting")
            .update({ admin_confirmed: true })
            .eq("retrieval_id", g.retrieval_id);
          if (updWaitErr) throw updWaitErr;

          const { error: updMainErr } = await supabase
            .from("main_retrievals")
            .update({ status: "admin_confirmed" })
            .eq("id", g.retrieval_id);
          if (updMainErr)
            console.warn("main_retrievals update warning:", updMainErr);

          const notif = {
            target_role: "secretary",
            title: `Retrieval ${g.retrieval_id} confirmed by admin`,
            body: JSON.stringify({
              retrieval_id: g.retrieval_id,
              confirmed_at: now,
            }),
            read: false,
          };
          const { error: notifErr } = await supabase
            .from("notifications")
            .insert([notif]);
          if (notifErr) console.warn("notification insert issue:", notifErr);
        } catch (innerErr) {
          console.error("confirmAll - failed for", g.retrieval_id, innerErr);
          failed.push(g.retrieval_id);
        }
      }

      if (failed.length === 0) {
        setGroups([]);
        setSuccess("All pending retrievals confirmed.");
      } else {
        setGroups((prev) =>
          prev.filter((g) => failed.includes(g.retrieval_id))
        );
        setError(`Failed to confirm retrievals: ${failed.join(", ")}`);
        setSuccess(`Confirmed others successfully.`);
      }
    } catch (e) {
      console.error("confirmAll", e);
      setError("Failed to confirm all retrievals. See console.");
    } finally {
      setProcessingAll(false);
    }
  };

  const declineGroup = async (retrievalId) => {
    setProcessingId(retrievalId);
    setError("");
    try {
      const now = new Date().toISOString();

      const { error: updWaitErr } = await supabase
        .from("pharmacy_waiting")
        .update({
          admin_confirmed: true,
        })
        .eq("retrieval_id", retrievalId);
      if (updWaitErr) throw updWaitErr;

      const { error: updMainErr } = await supabase
        .from("main_retrievals")
        .update({
          status: "admin_declined",
        })
        .eq("id", retrievalId);
      if (updMainErr)
        console.warn("main_retrievals update warning:", updMainErr);

      const notif = {
        target_role: "secretary",
        title: `Retrieval ${retrievalId} declined by admin`,
        body: JSON.stringify({
          retrieval_id: retrievalId,
          declined_at: now,
        }),
        read: false,
      };
      const { error: notifErr } = await supabase
        .from("notifications")
        .insert([notif]);
      if (notifErr) console.warn("notification insert issue:", notifErr);

      setGroups((prev) => prev.filter((g) => g.retrieval_id !== retrievalId));
      if (selected && selected.retrieval_id === retrievalId) {
        setShowModal(false);
        setSelected(null);
      }
      setSuccess(`Retrieval ${retrievalId} declined.`);
    } catch (e) {
      console.error("declineGroup", e);
      setError("Failed to decline retrieval. See console.");
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
              disabled={loading || processingAll}
            >
              Refresh
            </Button>{" "}
            <Button
              size="sm"
              variant="success"
              onClick={confirmAll}
              disabled={processingAll || loading || groups.length === 0}
            >
              {processingAll
                ? "Confirming all..."
                : `Confirm All (${groups.length})`}
            </Button>
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

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
                  <td colSpan="6" className="text-center text-muted">
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
                  <td>{g.items[0]?.status}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openGroup(g)}
                      disabled={
                        processingId === g.retrieval_id || processingAll
                      }
                    >
                      View
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => declineGroup(g.retrieval_id)}
                      disabled={
                        processingId === g.retrieval_id || processingAll
                      }
                    >
                      Decline
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
                processingId === (selected && selected.retrieval_id) ||
                processingAll
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
