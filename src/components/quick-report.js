import { Button, Container, Modal } from "react-bootstrap";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@mui/material";
import { BiSolidReport } from "react-icons/bi";
import { FaBoxOpen } from "react-icons/fa";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const QuickReport = ({ refreshTrigger }) => {
  const [reportData, setReportData] = useState({
    totalCollections: 0,
    transactionCount: 0,
    voidedCount: 0,
  });
  const [currentStaffName, setCurrentStaffName] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔹 Product metadata map for naming + images
  const [productMap, setProductMap] = useState({}); // product_ID -> { name, imgUrl }

  // -------- Helpers --------
  const publicProductUrl = (keyOrUrl) => {
    if (!keyOrUrl) return null; // ← no image available
    if (String(keyOrUrl).startsWith("http")) return keyOrUrl;
    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(`products/${keyOrUrl}`);
    return data?.publicUrl || null;
  };

  const buildProductMap = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("product_ID, product_name, product_img");
    if (error) {
      console.error("Products fetch error:", error);
      return;
    }
    const map = {};
    (data || []).forEach((p) => {
      map[p.product_ID] = {
        name: p.product_name || p.product_ID,
        imgUrl: publicProductUrl(p.product_img), // ← may be null
      };
    });
    setProductMap(map);
  };

  // Given a transaction, produce a “representative” product cell (image + name)
  const renderTxItemCell = (t) => {
    const first = t.transaction_items?.[0];
    if (!first) {
      return (
        <div className="d-flex align-items-center">
          <FaBoxOpen size={32} className="text-muted me-2" />
          <span>—</span>
        </div>
      );
    }

    const meta = productMap[first.product_code] || {
      name: first.product_code,
      imgUrl: null,
    };
    const more = Math.max(0, (t.transaction_items?.length || 0) - 1);
    const hasImg = !!meta.imgUrl;

    return (
      <div className="d-flex align-items-center">
        {hasImg ? (
          <img
            src={meta.imgUrl}
            alt={meta.name}
            style={{
              width: 40,
              height: 40,
              borderRadius: 6,
              objectFit: "cover",
              marginRight: 8,
              border: "1px solid #eee",
            }}
          />
        ) : (
          <FaBoxOpen size={32} className="text-muted me-2" />
        )}
        <div>
          <div>{meta.name}</div>
          {more > 0 && <small className="text-muted">+{more} more</small>}
        </div>
      </div>
    );
  };

  const renderLineItem = (code, qty) => {
    const meta = productMap[code] || { name: code, imgUrl: null };
    return (
      <div className="d-flex align-items-center mb-1">
        {meta.imgUrl ? (
          <img
            src={meta.imgUrl}
            alt={meta.name}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              objectFit: "cover",
              marginRight: 8,
              border: "1px solid #eee",
            }}
          />
        ) : (
          <FaBoxOpen size={20} className="text-muted me-2" />
        )}
        <span style={{ fontSize: "0.9rem" }}>
          {meta.name} ×{qty}
        </span>
      </div>
    );
  };

  // -------- Fetchers --------

  // Fetch report data for current staff (today)
  const fetchReportData = async () => {
    try {
      // 1) who am I?
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let staffName = null;

      if (user) {
        const { data: staff, error: staffError } = await supabase
          .from("staff")
          .select("staff_name")
          .eq("id", user.id)
          .single();
        if (staffError) throw staffError;
        staffName = staff.staff_name;
      } else {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return;
        staffName = JSON.parse(storedUser).staff_name;
      }

      // 2) today range
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(
        new Date().setHours(23, 59, 59, 999)
      ).toISOString();

      // 3) fetch
      const { data: txs, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .eq("staff", staffName);

      if (error) throw error;

      const completed = txs.filter((t) => t.status === "completed");
      const voided = txs.filter((t) => t.status === "voided");

      setReportData({
        totalCollections: completed.reduce(
          (sum, t) => sum + (t.total_amount || 0),
          0
        ),
        transactionCount: completed.length,
        voidedCount: voided.length,
      });

      setCurrentStaffName(staffName);
    } catch (err) {
      console.error("Error fetching report data:", err.message);
    }
  };

  // Full history (used by Void + History modals)
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let staffName = null;

      if (user) {
        const { data: staff, error: staffError } = await supabase
          .from("staff")
          .select("staff_name")
          .eq("id", user.id)
          .single();
        if (staffError) throw staffError;
        staffName = staff.staff_name;
      } else {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return;
        staffName = JSON.parse(storedUser).staff_name;
      }

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          transaction_items ( product_code, qty, price, subtotal ),
          transaction_payments ( method, amount )
        `
        )
        .eq("staff", staffName)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Only today's transactions (for the View Report modal)
  const fetchTransactionsToday = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let staffName = null;

      if (user) {
        const { data: staff, error: staffError } = await supabase
          .from("staff")
          .select("staff_name")
          .eq("id", user.id)
          .single();
        if (staffError) throw staffError;
        staffName = staff.staff_name;
      } else {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return;
        staffName = JSON.parse(storedUser).staff_name;
      }

      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(
        new Date().setHours(23, 59, 59, 999)
      ).toISOString();

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          transaction_items ( product_code, qty, price, subtotal ),
          transaction_payments ( method, amount )
        `
        )
        .eq("staff", staffName)
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching today's transactions:", err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restore stock on void AND return details of what we changed
   * so we can write logs:
   *  - product_code
   *  - qty (restored)
   *  - product_expiry (batch we added back to; 'yyyy-mm-dd' or null)
   *  - product_uuid (products.id of the batch row we updated)
   */
  const restoreStockForTransaction = async (transactionId) => {
    const { data: txItems, error: itemsError } = await supabase
      .from("transaction_items")
      .select("product_code, qty")
      .eq("transaction_id", transactionId);

    if (itemsError) throw itemsError;
    if (!txItems || txItems.length === 0) return [];

    const restored = [];

    for (const it of txItems) {
      const code = it.product_code;
      const qtyToRestore = Number(it.qty || 0);
      if (!code || qtyToRestore <= 0) continue;

      // Put back to the earliest-expiring batch we currently have
      const { data: batches, error: batchErr } = await supabase
        .from("products")
        .select("id, product_quantity, product_expiry")
        .eq("product_ID", code)
        .order("product_expiry", { ascending: true, nullsFirst: false })
        .limit(1);

      if (batchErr) throw batchErr;
      if (!batches || batches.length === 0) continue;

      const target = batches[0];
      const newQty = Number(target.product_quantity || 0) + qtyToRestore;

      const { error: updateErr } = await supabase
        .from("products")
        .update({ product_quantity: newQty })
        .eq("id", target.id);

      if (updateErr) throw updateErr;

      restored.push({
        product_code: code,
        qty: qtyToRestore,
        product_expiry: target.product_expiry
          ? new Date(target.product_expiry).toISOString().split("T")[0]
          : null,
        product_uuid: target.id,
      });
    }

    return restored;
  };

  const handleVoidTransaction = async (transactionId) => {
    if (
      !window.confirm(
        "Are you sure you want to void this transaction? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Only completed can be voided
      const { data: tx, error: txErr } = await supabase
        .from("transactions")
        .select("status")
        .eq("id", transactionId)
        .single();
      if (txErr) throw txErr;
      if (!tx || tx.status !== "completed") {
        alert("Only completed transactions can be voided.");
        setLoading(false);
        return;
      }

      // 1) Restore stock — and capture what we did for logging
      const restored = await restoreStockForTransaction(transactionId);

      // 2) Mark transaction as voided
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ status: "voided" })
        .eq("id", transactionId);
      if (updateError) throw updateError;

      // 3) Write logs for the void items (non-blocking if it fails)
      try {
        // Who is staff?
        const {
          data: { user },
        } = await supabase.auth.getUser();
        let staffName = null;

        if (user) {
          const { data: staff, error: staffError } = await supabase
            .from("staff")
            .select("staff_name")
            .eq("id", user.id)
            .single();
          if (staffError) throw staffError;
          staffName = staff.staff_name;
        } else {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            staffName = JSON.parse(storedUser).staff_name;
          }
        }

        const codes = [...new Set(restored.map((r) => r.product_code))];

        // Pull product meta to fill names/category/unit
        const { data: prodMeta, error: metaErr } = await supabase
          .from("products")
          .select("id, product_ID, product_name, product_category, product_unit")
          .in("product_ID", codes);
        if (metaErr) throw metaErr;

        const metaByCode = {};
        (prodMeta || []).forEach((p) => {
          if (!metaByCode[p.product_ID]) metaByCode[p.product_ID] = p;
        });

        const logsPayload = restored.map((r) => {
          const meta = metaByCode[r.product_code] || {};
          return {
            product_id: r.product_code,
            product_name: meta.product_name || r.product_code,
            product_quantity: r.qty,
            product_category: meta.product_category || null,
            product_unit: meta.product_unit || null,
            product_expiry: r.product_expiry || null, // where we placed it back
            staff: staffName || "Unknown",
            product_action: "Void",
            product_uuid: meta.id || r.product_uuid || null,
          };
        });

        if (logsPayload.length > 0) {
          const { error: logErr } = await supabase
            .from("logs")
            .insert(logsPayload);
          if (logErr) {
            console.error("Failed to insert void logs:", logErr.message);
          }
        }
      } catch (logErr) {
        console.error("Logging (void) error:", logErr.message);
      }

      alert("Transaction voided and stock restored successfully!");
      setShowVoidModal(false);

      await Promise.all([fetchReportData(), fetchTransactions()]);
    } catch (err) {
      console.error(
        "Error voiding transaction and restoring stock:",
        err.message
      );
      alert("Failed to void transaction and restore stock.");
    } finally {
      setLoading(false);
    }
  };

  // -------- Effects --------
  useEffect(() => {
    buildProductMap();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [refreshTrigger]);

  // -------- Handlers (open modals) --------
  const handleViewReport = () => {
    fetchTransactionsToday();
    setShowReportModal(true);
  };
  const handleVoid = () => {
    fetchTransactions();
    setShowVoidModal(true);
  };
  const handleHistory = () => {
    fetchTransactions();
    setShowHistoryModal(true);
  };

  return (
    <>
      <Container className="bg-white mx-1 my-2 rounded p-0" fluid>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                colSpan={2}
                sx={{
                  fontWeight: "bold",
                  fontSize: "1rem",
                  borderBottom: "2px solid #ccc",
                }}
              >
                <BiSolidReport style={{ marginRight: 8 }} />
                My Quick Report
                {currentStaffName && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: "normal",
                      color: "#666",
                    }}
                  >
                    Staff: {currentStaffName}
                  </div>
                )}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ borderBottom: "1px solid #ddd" }}>
                Total Collections
              </TableCell>
              <TableCell align="right" sx={{ borderBottom: "1px solid #ddd" }}>
                ₱{reportData.totalCollections.toFixed(2)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ borderBottom: "1px solid #ddd" }}>
                # of Transactions
              </TableCell>
              <TableCell align="right" sx={{ borderBottom: "1px solid #ddd" }}>
                {reportData.transactionCount}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ borderBottom: "1px solid #ddd" }}>
                # of Voided Transaction
              </TableCell>
              <TableCell align="right" sx={{ borderBottom: "1px solid #ddd" }}>
                {reportData.voidedCount}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Buttons stacked vertically */}
        <div className="d-flex flex-column p-3">
          <Button className="mb-2" onClick={handleViewReport}>
            View Report
          </Button>
          <Button className="mb-2" variant="danger" onClick={handleVoid}>
            Void
          </Button>
          <Button className="mb-2" variant="secondary" onClick={handleHistory}>
            History
          </Button>
        </div>
      </Container>

      {/* View Report (Today only) */}
      <Modal
        show={showReportModal}
        onHide={() => setShowReportModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Daily Report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <h6>Summary</h6>
            <p>
              <strong>Total Collections:</strong> ₱
              {reportData.totalCollections.toFixed(2)}
            </p>
            <p>
              <strong>Completed Transactions:</strong>{" "}
              {reportData.transactionCount}
            </p>
            <p>
              <strong>Voided Transactions:</strong> {reportData.voidedCount}
            </p>
          </div>

          <h6>Recent Transactions (Today)</h6>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                        No transactions today
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{renderTxItemCell(t)}</TableCell>
                        <TableCell>
                          {new Date(t.created_at).toLocaleDateString()}{" "}
                          {new Date(t.created_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          ₱{(t.total_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`badge ${
                              t.status === "completed"
                                ? "bg-success"
                                : "bg-danger"
                            }`}
                          >
                            {t.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* Void Modal (recent list) */}
      <Modal
        show={showVoidModal}
        onHide={() => setShowVoidModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Void Transaction</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-warning">
            ⚠️ Select a transaction to void. This action cannot be undone.
          </p>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Action</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions
                    .filter((t) => t.status === "completed")
                    .map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleVoidTransaction(t.id)}
                            disabled={loading}
                          >
                            Void
                          </Button>
                        </TableCell>
                        <TableCell>
                          {t.transaction_items?.map((item, idx) => (
                            <div key={idx}>
                              {renderLineItem(item.product_code, item.qty)}
                            </div>
                          ))}
                        </TableCell>

                        <TableCell>
                          {new Date(t.created_at).toLocaleDateString()}{" "}
                          {new Date(t.created_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          ₱{(t.total_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className="badge bg-success">completed</span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* History Modal */}
      <Modal
        show={showHistoryModal}
        onHide={() => setShowHistoryModal(false)}
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>Transaction History</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Payment Methods</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{renderTxItemCell(t)}</TableCell>
                      <TableCell>
                        {new Date(t.created_at).toLocaleDateString()}
                        <br />
                        <small>
                          {new Date(t.created_at).toLocaleTimeString()}
                        </small>
                      </TableCell>
                      <TableCell>₱{(t.total_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {t.transaction_items?.map((item, idx) => (
                          <div key={idx}>
                            {renderLineItem(item.product_code, item.qty)}
                          </div>
                        ))}
                      </TableCell>

                      <TableCell>
                        {t.transaction_payments?.map((payment, idx) => (
                          <div key={idx} style={{ fontSize: "0.8rem" }}>
                            {payment.method}: ₱
                            {(payment.amount || 0).toFixed(2)}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`badge ${
                            t.status === "completed"
                              ? "bg-success"
                              : "bg-danger"
                          }`}
                        >
                          {t.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default QuickReport;
