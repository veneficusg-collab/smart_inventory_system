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
  const [selectedAction, setSelectedAction] = useState(null); // 'void' or 'damage'
  const [showActionConfirmation, setShowActionConfirmation] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

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

  // Given a transaction, produce a "representative" product cell (image + name)
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

  const getCurrentStaffName = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: staff, error } = await supabase
          .from("staff")
          .select("staff_name")
          .eq("id", user.id)
          .limit(1)
          .single();
        if (!error && staff) return staff.staff_name || "Unknown";
      }
    } catch (_) {}
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.staff_name || parsed?.staff_barcode || "Unknown";
      }
    } catch (_) {}
    return "Unknown";
  };

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

  const showActionModal = (transaction, actionType) => {
    setSelectedTransaction(transaction);
    setSelectedAction(actionType);
    setShowActionConfirmation(true);
  };

  const handleActionConfirmation = async () => {
    if (!selectedTransaction || !selectedAction) return;

    try {
      setLoading(true);
      
      const transactionId = selectedTransaction.id;
      const actionType = selectedAction;
      
      // Only completed can be voided or marked as damage
      const { data: tx, error: txErr } = await supabase
        .from("transactions")
        .select("status")
        .eq("id", transactionId)
        .single();
      if (txErr) throw txErr;
      if (!tx || tx.status !== "completed") {
        alert("Only completed transactions can be modified.");
        setLoading(false);
        setShowActionConfirmation(false);
        return;
      }

      // Determine new status based on action type
      const newStatus = actionType === 'void' ? 'voided' : 'damaged';
      
      // Restore stock only for void action (damage doesn't restore stock)
      if (actionType === 'void') {
        const restored = await restoreStockForTransaction(transactionId);
        
        // Log the restored items
        if (restored.length > 0) {
          try {
            const staffName = await getCurrentStaffName();
            const codes = [...new Set(restored.map((r) => r.product_code))];

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
                product_expiry: r.product_expiry || null,
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
        }
      } else if (actionType === 'damage') {
        // For damage returns, log as "Return as Damage" without restoring stock
        try {
          const staffName = await getCurrentStaffName();
          
          const { data: txItems, error: itemsError } = await supabase
            .from("transaction_items")
            .select("product_code, qty")
            .eq("transaction_id", transactionId);
            
          if (itemsError) throw itemsError;
          
          if (txItems && txItems.length > 0) {
            const codes = [...new Set(txItems.map((item) => item.product_code))];
            
            const { data: prodMeta, error: metaErr } = await supabase
              .from("products")
              .select("id, product_ID, product_name, product_category, product_unit")
              .in("product_ID", codes);
            if (metaErr) throw metaErr;

            const metaByCode = {};
            (prodMeta || []).forEach((p) => {
              if (!metaByCode[p.product_ID]) metaByCode[p.product_ID] = p;
            });

            const logsPayload = txItems.map((item) => {
              const meta = metaByCode[item.product_code] || {};
              return {
                product_id: item.product_code,
                product_name: meta.product_name || item.product_code,
                product_quantity: item.qty,
                product_category: meta.product_category || null,
                product_unit: meta.product_unit || null,
                product_expiry: null, // Damage returns don't have expiry
                staff: staffName || "Unknown",
                product_action: "Return as Damage",
                product_uuid: meta.id || null,
              };
            });

            if (logsPayload.length > 0) {
              const { error: logErr } = await supabase
                .from("logs")
                .insert(logsPayload);
              if (logErr) {
                console.error("Failed to insert damage logs:", logErr.message);
              }
            }
          }
        } catch (logErr) {
          console.error("Logging (damage) error:", logErr.message);
        }
      }

      // Update transaction status
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ status: newStatus })
        .eq("id", transactionId);
      if (updateError) throw updateError;

      alert(`Transaction ${actionType === 'void' ? 'voided' : 'marked as damage'} successfully!`);
      
      // Close modals
      setShowActionConfirmation(false);
      setShowVoidModal(false);
      
      // Refresh data
      await Promise.all([fetchReportData(), fetchTransactions()]);
    } catch (err) {
      console.error(
        `Error ${selectedAction === 'void' ? 'voiding' : 'marking as damage'} transaction:`,
        err.message
      );
      alert(`Failed to ${selectedAction === 'void' ? 'void' : 'mark as damage'} transaction.`);
    } finally {
      setLoading(false);
      setSelectedAction(null);
      setSelectedTransaction(null);
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
            Void / Damage Return
          </Button>
          <Button className="mb-2" variant="secondary" onClick={handleHistory}>
            History
          </Button>
        </div>
      </Container>

      {/* Action Confirmation Modal */}
      <Modal
        show={showActionConfirmation}
        onHide={() => {
          if (!loading) {
            setShowActionConfirmation(false);
            setSelectedAction(null);
            setSelectedTransaction(null);
          }
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedAction === 'void' ? 'Void Transaction' : 'Return as Damage'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-warning">
            ⚠️ Are you sure you want to {selectedAction === 'void' ? 'void' : 'return as damage'} this transaction?
          </p>
          <p>
            <strong>Transaction ID:</strong> {selectedTransaction?.id}
          </p>
          <p>
            <strong>Date:</strong> {selectedTransaction ? new Date(selectedTransaction.created_at).toLocaleString() : ''}
          </p>
          <p>
            <strong>Total Amount:</strong> ₱{selectedTransaction?.total_amount?.toFixed(2) || '0.00'}
          </p>
          <div className="mt-2">
            <strong>Items:</strong>
            {selectedTransaction?.transaction_items?.map((item, idx) => (
              <div key={idx}>
                {renderLineItem(item.product_code, item.qty)}
              </div>
            ))}
          </div>
          <div className="mt-3">
            {selectedAction === 'void' ? (
              <div className="alert alert-info">
                <small>
                  <strong>Note:</strong> Voiding will restore stock to inventory and log as "Void".
                </small>
              </div>
            ) : (
              <div className="alert alert-warning">
                <small>
                  <strong>Note:</strong> Returning as damage will not restore stock and will be logged as "Return as Damage".
                </small>
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowActionConfirmation(false);
              setSelectedAction(null);
              setSelectedTransaction(null);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant={selectedAction === 'void' ? 'danger' : 'warning'}
            onClick={handleActionConfirmation}
            disabled={loading}
          >
            {loading ? 'Processing...' : selectedAction === 'void' ? 'Void Transaction' : 'Return as Damage'}
          </Button>
        </Modal.Footer>
      </Modal>

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
                                : t.status === "damaged"
                                ? "bg-warning"
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

      {/* Void/Damage Modal (recent list) */}
      <Modal
        show={showVoidModal}
        onHide={() => setShowVoidModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Void / Return as Damage</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-warning">
            ⚠️ Select a transaction to void or return as damage.
          </p>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Actions</TableCell>
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
                          <div className="d-flex flex-column gap-1">
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => showActionModal(t, 'void')}
                              disabled={loading}
                            >
                              Void
                            </Button>
                            <Button
                              size="sm"
                              variant="warning"
                              onClick={() => showActionModal(t, 'damage')}
                              disabled={loading}
                            >
                              Return as Damage
                            </Button>
                          </div>
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
                              : t.status === "damaged"
                              ? "bg-warning"
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