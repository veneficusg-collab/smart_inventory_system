import { Button, Container, Modal, Form, Badge } from "react-bootstrap";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Checkbox,
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
  const [selectedItems, setSelectedItems] = useState([]); // Array of selected item indices
  const [partialReturn, setPartialReturn] = useState(false);

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

  const renderLineItem = (code, qty, idx = null, transactionId = null, selected = false, onSelect = null) => {
    const meta = productMap[code] || { name: code, imgUrl: null };
    return (
      <div className="d-flex align-items-center mb-1" key={idx}>
        {idx !== null && onSelect && (
          <Checkbox
            checked={selected}
            onChange={() => onSelect(idx)}
            size="small"
            sx={{ mr: 1 }}
          />
        )}
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
      const damaged = txs.filter((t) => t.status === "damaged");

      setReportData({
        totalCollections: completed.reduce(
          (sum, t) => sum + (t.total_amount || 0),
          0
        ),
        transactionCount: completed.length,
        voidedCount: voided.length + damaged.length,
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
          transaction_items ( id, product_code, qty, price, subtotal ),
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

  const restoreStockForItems = async (itemsToRestore) => {
    const restored = [];

    for (const it of itemsToRestore) {
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
    setSelectedItems([]); // Reset selection
    setPartialReturn(false); // Reset partial return
    setShowActionConfirmation(true);
  };

  const handleItemSelection = (index) => {
    setSelectedItems(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const toggleSelectAll = () => {
    if (!selectedTransaction?.transaction_items) return;
    
    if (selectedItems.length === selectedTransaction.transaction_items.length) {
      // Deselect all
      setSelectedItems([]);
    } else {
      // Select all
      setSelectedItems(selectedTransaction.transaction_items.map((_, idx) => idx));
    }
  };

  const handleActionConfirmation = async () => {
    if (!selectedTransaction || !selectedAction) return;

    try {
      setLoading(true);
      
      const transactionId = selectedTransaction.id;
      const actionType = selectedAction;
      
      // Get items to process
      const allItems = selectedTransaction.transaction_items || [];
      const itemsToProcess = partialReturn 
        ? selectedItems.map(idx => allItems[idx])
        : allItems;

      if (itemsToProcess.length === 0) {
        alert("Please select at least one item to process.");
        setLoading(false);
        return;
      }

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

      // For partial returns, we need to create a new transaction for remaining items
      let newTransactionId = transactionId;
      if (partialReturn && selectedItems.length < allItems.length) {
        // Create a new transaction with the remaining items
        const remainingItems = allItems.filter((_, idx) => !selectedItems.includes(idx));
        
        if (remainingItems.length > 0) {
          // Calculate total for remaining items
          const remainingTotal = remainingItems.reduce((sum, item) => {
            return sum + (item.subtotal || (item.price * item.qty));
          }, 0);

          // Create new transaction record
          const { data: newTx, error: newTxError } = await supabase
            .from("transactions")
            .insert({
              total_amount: remainingTotal,
              status: 'completed',
              staff: selectedTransaction.staff,
              staff_id: selectedTransaction.staff_id,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (newTxError) throw newTxError;

          // Create transaction items for the new transaction
          const transactionItems = remainingItems.map(item => ({
            transaction_id: newTx.id,
            qty: item.qty,
            price: item.price,
            subtotal: item.subtotal || (item.price * item.qty),
            product_code: item.product_code
          }));

          const { error: itemsError } = await supabase
            .from("transaction_items")
            .insert(transactionItems);

          if (itemsError) throw itemsError;

          // Copy payment methods proportionally
          const originalPayments = selectedTransaction.transaction_payments || [];
          const originalTotal = selectedTransaction.total_amount;
          
          if (originalPayments.length > 0 && originalTotal > 0) {
            const paymentRatio = remainingTotal / originalTotal;
            const newPayments = originalPayments.map(payment => ({
              transaction_id: newTx.id,
              method: payment.method,
              amount: payment.amount * paymentRatio
            }));

            const { error: paymentsError } = await supabase
              .from("transaction_payments")
              .insert(newPayments);

            if (paymentsError) throw paymentsError;
          }
        }
        
        // The original transaction will be voided/returned for selected items only
        newTransactionId = transactionId; // Keep using original ID for the return
      }

      // Process the selected items
      if (actionType === 'void') {
        const restored = await restoreStockForItems(itemsToProcess);
        
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
          const codes = [...new Set(itemsToProcess.map((item) => item.product_code))];
          
          const { data: prodMeta, error: metaErr } = await supabase
            .from("products")
            .select("id, product_ID, product_name, product_category, product_unit")
            .in("product_ID", codes);
          if (metaErr) throw metaErr;

          const metaByCode = {};
          (prodMeta || []).forEach((p) => {
            if (!metaByCode[p.product_ID]) metaByCode[p.product_ID] = p;
          });

          const logsPayload = itemsToProcess.map((item) => {
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
        } catch (logErr) {
          console.error("Logging (damage) error:", logErr.message);
        }
      }

      // If partial return and not all items selected, update the original transaction
      if (partialReturn && selectedItems.length < allItems.length) {
        // Update the original transaction status if all items are processed
        if (selectedItems.length === allItems.length) {
          const { error: updateError } = await supabase
            .from("transactions")
            .update({ status: actionType === 'void' ? 'voided' : 'damaged' })
            .eq("id", transactionId);
          if (updateError) throw updateError;
        }
      } else {
        // Full return - update transaction status
        const { error: updateError } = await supabase
          .from("transactions")
          .update({ status: actionType === 'void' ? 'voided' : 'damaged' })
          .eq("id", transactionId);
        if (updateError) throw updateError;
      }

      alert(`Successfully ${actionType === 'void' ? 'voided' : 'marked as damage'} ${itemsToProcess.length} item(s)!`);
      
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
      alert(`Failed to ${selectedAction === 'void' ? 'void' : 'mark as damage'} item(s).`);
    } finally {
      setLoading(false);
      setSelectedAction(null);
      setSelectedTransaction(null);
      setSelectedItems([]);
      setPartialReturn(false);
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
                # of Voided/Damaged
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
            setSelectedItems([]);
            setPartialReturn(false);
          }
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedAction === 'void' ? 'Void Items' : 'Return Items as Damage'}
            {partialReturn && " (Partial Return)"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-warning">
            ⚠️ Select which items to {selectedAction === 'void' ? 'void' : 'return as damage'}
          </p>
          
          <div className="mb-3">
            <p>
              <strong>Transaction ID:</strong> {selectedTransaction?.id}
            </p>
            <p>
              <strong>Date:</strong> {selectedTransaction ? new Date(selectedTransaction.created_at).toLocaleString() : ''}
            </p>
            <p>
              <strong>Total Amount:</strong> ₱{selectedTransaction?.total_amount?.toFixed(2) || '0.00'}
            </p>
          </div>

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <Form.Check
                type="switch"
                id="partial-return-switch"
                label="Partial Return"
                checked={partialReturn}
                onChange={(e) => setPartialReturn(e.target.checked)}
              />
              {partialReturn && (
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={toggleSelectAll}
                >
                  {selectedItems.length === selectedTransaction?.transaction_items?.length 
                    ? 'Deselect All' 
                    : 'Select All'}
                </Button>
              )}
            </div>
            
            <div className="alert alert-info">
              <small>
                <strong>Note:</strong> {partialReturn 
                  ? 'Select specific items to return. Unselected items will remain in the transaction.'
                  : 'All items in this transaction will be processed.'}
              </small>
            </div>
          </div>

          <div className="mt-2">
            <strong>Select Items:</strong>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {selectedTransaction?.transaction_items?.map((item, idx) => (
                <div key={idx} className="mb-2 p-2 border rounded">
                  <div className="d-flex align-items-center">
                    {partialReturn ? (
                      <Checkbox
                        checked={selectedItems.includes(idx)}
                        onChange={() => handleItemSelection(idx)}
                        size="small"
                        sx={{ mr: 2 }}
                      />
                    ) : (
                      <Badge bg="primary" className="me-2">ALL</Badge>
                    )}
                    {renderLineItem(
                      item.product_code, 
                      item.qty, 
                      null, 
                      null, 
                      !partialReturn || selectedItems.includes(idx),
                      null
                    )}
                    <div className="ms-auto">
                      <strong>₱{(item.subtotal || (item.price * item.qty)).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3">
            {selectedAction === 'void' ? (
              <div className="alert alert-info">
                <small>
                  <strong>Voiding will:</strong> 
                  {partialReturn ? ' Restore selected items to inventory.' : ' Restore all items to inventory.'}
                  {partialReturn && selectedItems.length < selectedTransaction?.transaction_items?.length && 
                    ' The remaining items will stay in the transaction.'}
                </small>
              </div>
            ) : (
              <div className="alert alert-warning">
                <small>
                  <strong>Return as damage will:</strong> 
                  {partialReturn ? ' Log selected items as damaged.' : ' Log all items as damaged.'}
                  {partialReturn && selectedItems.length < selectedTransaction?.transaction_items?.length && 
                    ' The remaining items will stay in the transaction.'}
                </small>
              </div>
            )}
          </div>

          {partialReturn && (
            <div className="mt-2">
              <Badge bg={selectedItems.length > 0 ? "success" : "secondary"}>
                {selectedItems.length} item(s) selected
              </Badge>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowActionConfirmation(false);
              setSelectedAction(null);
              setSelectedTransaction(null);
              setSelectedItems([]);
              setPartialReturn(false);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant={selectedAction === 'void' ? 'danger' : 'warning'}
            onClick={handleActionConfirmation}
            disabled={loading || (partialReturn && selectedItems.length === 0)}
          >
            {loading ? 'Processing...' : 
             `${selectedAction === 'void' ? 'Void' : 'Return'} ${partialReturn ? selectedItems.length + ' Item(s)' : 'Transaction'}`
            }
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
              <strong>Voided/Damaged Transactions:</strong> {reportData.voidedCount}
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
                          <Badge 
                            bg={
                              t.status === "completed" ? "success" :
                              t.status === "damaged" ? "warning" : "danger"
                            }
                          >
                            {t.status}
                          </Badge>
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
        size="xl"
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
                          <Badge bg="success">completed</Badge>
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
                        <Badge 
                          bg={
                            t.status === "completed" ? "success" :
                            t.status === "damaged" ? "warning" : "danger"
                          }
                        >
                          {t.status}
                        </Badge>
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