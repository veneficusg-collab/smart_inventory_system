// DTR.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { Button, Container, Row, Col, Form, Nav, Tab, Tabs } from "react-bootstrap";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
} from "@mui/material";
import { IoMdPrint } from "react-icons/io";
import { supabase } from "../supabaseClient";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

function dayToRange(dateStr) {
  const start = new Date(dateStr);
  const end = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

function monthToRange(ymStr) {
  const [y, m] = ymStr.split("-").map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

function customToRange(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

const currency = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

// Helper function to categorize logs based on product_action
const filterLogsByCategory = (logs, category) => {
  if (!logs || logs.length === 0) return [];
  
  if (category === "All") return logs;
  
  const posActions = ["Sale", "Void"];
  const stockRoomActions = ["Main Stock Room", "Main Stock Room Archive", "Main Stock Room Restore", 
                           "Restock - Main Stock Room (New Batch)", "Main Stock Room Add Product"];
  const pharmacyActions = ["Restock", "Archive", "Restore", "Unstock", "Delete", "Add Product"];
  
  if (category === "POS") {
    return logs.filter(log => posActions.includes(log.product_action));
  }
  
  if (category === "Stock Room") {
    return logs.filter(log => stockRoomActions.includes(log.product_action));
  }
  
  if (category === "Pharmacy") {
    // Filter out actions that belong to POS or Stock Room
    return logs.filter(log => 
      pharmacyActions.includes(log.product_action) && 
      !posActions.includes(log.product_action) && 
      !stockRoomActions.includes(log.product_action)
    );
  }
  
  return logs;
};

// Helper function to filter transactions for POS (only transactions with Sale or Void status)
const filterPOSTransactions = (transactions) => {
  if (!transactions) return [];
  
  // For POS, we want transactions that are completed or voided
  return transactions.filter(transaction => 
    transaction.status === "completed" || transaction.status === "voided"
  );
};

const DTR = () => {
  const printRef = useRef(null);

  const [mode, setMode] = useState("daily");
  const [logCategory, setLogCategory] = useState("All"); // New state for log category
  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];
  const defaultMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const [date, setDate] = useState(defaultDate);
  const [month, setMonth] = useState(defaultMonth);
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);

  const [staffRole, setStaffRole] = useState("");
  const [staffName, setStaffName] = useState("");
  const [productMap, setProductMap] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const publicProductUrl = (keyOrUrl) => {
    if (!keyOrUrl) return null;
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
      console.error("Products fetch error:", error.message);
      return;
    }
    const map = {};
    (data || []).forEach((p) => {
      map[p.product_ID] = {
        name: p.product_name || p.product_ID,
        imgUrl: publicProductUrl(p.product_img),
      };
    });
    setProductMap(map);
  };

  const getSessionStaff = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("staff")
        .select("staff_name, staff_position")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return { staff_name: data.staff_name, staff_position: data.staff_position };
    } else {
      const stored = localStorage.getItem("user");
      if (!stored) throw new Error("No logged in user found");
      const parsed = JSON.parse(stored);
      return {
        staff_name: parsed.staff_name,
        staff_position: parsed.staff_position,
      };
    }
  };

  const getRange = () => {
    if (mode === "daily") return dayToRange(date);
    if (mode === "monthly") return monthToRange(month);
    if (mode === "custom") return customToRange(startDate, endDate);
    return {};
  };

  const fetchData = async () => {
    if (mode === "custom" && new Date(startDate) > new Date(endDate)) {
      alert("Start Date cannot be after End Date.");
      return;
    }

    setLoading(true);
    try {
      const { staff_name, staff_position } = await getSessionStaff();
      setStaffRole(staff_position);
      setStaffName(staff_name);

      const { startISO, endISO } = getRange();

      let txQuery = supabase
        .from("transactions")
        .select(
          `
            *,
            transaction_items ( product_code, qty, price, subtotal ),
            transaction_payments ( method, amount )
          `
        )
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      let logQuery = supabase
        .from("logs")
        .select("*")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (staff_position !== "admin" && staff_position !== "super_admin") {
        txQuery = txQuery.eq("staff", staff_name);
        logQuery = logQuery.eq("staff", staff_name);
      }

      const [{ data: txs, error: txErr }, { data: lgs, error: logErr }] =
        await Promise.all([txQuery, logQuery]);

      if (txErr) throw txErr;
      if (logErr) throw logErr;

      setTransactions(txs || []);
      setLogs(lgs || []);
    } catch (e) {
      console.error("Report fetch error:", e.message);
      setTransactions([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buildProductMap();
  }, []);

  useEffect(() => {
    fetchData();
  }, [mode, date, month, startDate, endDate]);

  // Filter logs based on selected category
  const filteredLogs = useMemo(() => {
    return filterLogsByCategory(logs, logCategory);
  }, [logs, logCategory]);

  // Filter transactions for POS tab (only completed and voided transactions)
  const filteredTransactions = useMemo(() => {
    if (logCategory === "POS") {
      return filterPOSTransactions(transactions);
    }
    return transactions;
  }, [transactions, logCategory]);

  // Calculate summary based on filtered transactions for POS, all transactions for other tabs
  const summary = useMemo(() => {
    const transactionsToUse = logCategory === "POS" ? filteredTransactions : transactions;
    const completed = (transactionsToUse || []).filter((t) => t.status === "completed");
    const totalSales = completed.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const txCompleted = completed.length;
    const txVoided = (transactionsToUse || []).filter((t) => t.status === "voided").length;

    // Calculate top sold items from filtered transactions
    const itemsSoldByCode = {};
    (transactionsToUse || []).forEach((t) => {
      if (t.status === "completed") { // Only count completed sales for top items
        (t.transaction_items || []).forEach((it) => {
          itemsSoldByCode[it.product_code] =
            (itemsSoldByCode[it.product_code] || 0) + (Number(it.qty) || 0);
        });
      }
    });

    const soldArray = Object.entries(itemsSoldByCode)
      .map(([code, qty]) => ({
        code,
        qty,
        name: productMap[code]?.name || code,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    return { totalSales, txCompleted, txVoided, topSold: soldArray };
  }, [transactions, filteredTransactions, logCategory, productMap]);

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>${mode === "daily" ? "Daily" : mode === "monthly" ? "Monthly" : "Custom"} Report - ${logCategory}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
            h4, h5, h6 { margin: 4px 0; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 4px; font-size: 11px; }
            th { background: #f2f2f2; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const rangeLabel = useMemo(() => {
    if (mode === "daily") {
      return new Date(date).toLocaleDateString();
    }
    if (mode === "monthly") {
      return new Date(`${month}-01`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      });
    }
    if (mode === "custom") {
      const start = new Date(startDate).toLocaleDateString();
      const end = new Date(endDate).toLocaleDateString();
      return `${start} - ${end}`;
    }
    return "";
  }, [mode, date, month, startDate, endDate]);

  return (
    <Container fluid className="bg-white mx-4 my-2 rounded p-3" style={{ width: "140vh" }}>
      {/* Header / Controls */}
      <Row className="align-items-end no-print">
        <Col xs={12} md={6}>
          <h4 className="mt-2 mb-0">Reports</h4>
          <div className="text-muted">
            Mode: {mode.toUpperCase()} · Staff: {staffName || "N/A"} · Role:{" "}
            {staffRole || "N/A"}
          </div>
        </Col>
        <Col xs={12} md={6} className="d-flex justify-content-end">
          <Nav variant="tabs">
            <Nav.Item>
              <Nav.Link active={mode === "daily"} onClick={() => setMode("daily")}>
                Daily
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link active={mode === "monthly"} onClick={() => setMode("monthly")}>
                Monthly
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link active={mode === "custom"} onClick={() => setMode("custom")}>
                Custom
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Col>
      </Row>

      {/* Filters + Print */}
      <Row className="no-print mt-2">
        {mode === "daily" && (
          <Col xs={12} md={4}>
            <Form.Label>Select Date</Form.Label>
            <Form.Control type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Col>
        )}
        {mode === "monthly" && (
          <Col xs={12} md={4}>
            <Form.Label>Select Month</Form.Label>
            <Form.Control
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </Col>
        )}
        {mode === "custom" && (
          <>
            <Col xs={6} md={3}>
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Col>
            <Col xs={6} md={3}>
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Col>
          </>
        )}

        <Col
          xs={12}
          md={mode === "custom" ? 6 : 8}
          className="d-flex justify-content-end align-items-end"
        >
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={fetchData} disabled={loading}>
              Refresh
            </Button>
            <Button variant="success" onClick={handlePrint}>
              <IoMdPrint style={{ marginRight: 6 }} />
              Print
            </Button>
          </div>
        </Col>
      </Row>

      {/* Log Category Tabs */}
      <Row className="no-print mt-3">
        <Col xs={12}>
          <Tabs
            activeKey={logCategory}
            onSelect={(k) => setLogCategory(k)}
            className="mb-3"
          >
            <Tab eventKey="All" title="All">
              <small className="text-muted">Showing all inventory logs, transactions, and full summary</small>
            </Tab>
            <Tab eventKey="POS" title="POS">
              <small className="text-muted">Showing POS summary, top sold items, and POS transactions only (completed/voided)</small>
            </Tab>
            <Tab eventKey="Pharmacy" title="Pharmacy">
              <small className="text-muted">Showing Pharmacy logs only (Restock, Archive, Restore, Unstock, Delete, Add Product)</small>
            </Tab>
            <Tab eventKey="Stock Room" title="Stock Room">
              <small className="text-muted">Showing Stock Room logs only (Main Stock Room operations)</small>
            </Tab>
          </Tabs>
        </Col>
      </Row>

      {/* PRINTABLE CONTENT */}
      <div ref={printRef}>
        <div className="text-center mt-3">
          <h5>🐾 Pet Matters</h5>
          <p style={{ margin: 0 }}>123 Main St, City | Tel: 0999-999-9999</p>
          <p style={{ margin: "2px 0" }}>
            <b>{mode.charAt(0).toUpperCase() + mode.slice(1)} Report — {rangeLabel}</b>
          </p>
          <p style={{ margin: "2px 0", fontSize: "14px" }}>
            <b>View: {logCategory}</b>
          </p>
        </div>

        {/* Summary - Show for All and POS tabs */}
        {(logCategory === "All" || logCategory === "POS") && (
          <Row className="mt-3">
            <Col xs={12}>
              <div className="fw-bold">Summary {logCategory === "POS" ? "(POS Only)" : ""}</div>
            </Col>
            <Col xs={12} md={4} className="mt-2">
              <div className="p-2 border rounded">
                <div className="fw-bold">Total Collections</div>
                <div style={{ fontSize: 18 }}>{currency(summary.totalSales)}</div>
              </div>
            </Col>
            <Col xs={12} md={4} className="mt-2">
              <div className="p-2 border rounded">
                <div className="fw-bold">Completed Transactions</div>
                <div style={{ fontSize: 18 }}>{summary.txCompleted}</div>
              </div>
            </Col>
            <Col xs={12} md={4} className="mt-2">
              <div className="p-2 border rounded">
                <div className="fw-bold">Voided Transactions</div>
                <div style={{ fontSize: 18 }}>{summary.txVoided}</div>
              </div>
            </Col>
          </Row>
        )}

        {/* Top Items - Show for All and POS tabs */}
        {(logCategory === "All" || logCategory === "POS") && (
          <>
            <h6 className="fw-bold mt-3">Top 10 Sold Items {logCategory === "POS" ? "(POS Only)" : ""}</h6>
            <TableContainer component={Paper} className="mb-3">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.topSold.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        No items in this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    summary.topSold.map((row) => (
                      <TableRow key={row.code}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">{row.qty}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Transactions - Show for All and POS tabs */}
        {(logCategory === "All" || logCategory === "POS") && (
          <>
            <h6 className="fw-bold">Transactions {logCategory === "POS" ? "(POS Only)" : ""} ({filteredTransactions.length})</h6>
            <TableContainer component={Paper} className="mb-3">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>{mode === "daily" ? "Time" : "Date"}</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Payments</TableCell>
                    <TableCell>Personnel</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No transactions
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.id}</TableCell>
                        <TableCell>
                          {mode === "daily"
                            ? new Date(t.created_at).toLocaleTimeString()
                            : new Date(t.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{currency(t.total_amount)}</TableCell>
                        <TableCell>
                          {(t.transaction_items || []).map((it, i) => {
                            const name =
                              productMap[it.product_code]?.name || it.product_code;
                            return (
                              <div key={i}>
                                {name} ×{it.qty}
                              </div>
                            );
                          })}
                        </TableCell>
                        <TableCell>
                          {(t.transaction_payments || []).map((p, i) => (
                            <div key={i}>
                              {p.method}: {currency(p.amount)}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell>{t.staff || "N/A"}</TableCell>
                        <TableCell>{t.status}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Logs - Show for All, Pharmacy, and Stock Room tabs, but NOT for POS */}
        {logCategory !== "POS" && (
          <>
            <h6 className="fw-bold">Inventory Logs - {logCategory} ({filteredLogs.length})</h6>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{mode === "daily" ? "Time" : "Date"}</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Staff</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No {logCategory !== "All" ? logCategory.toLowerCase() : ""} logs in this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((lg) => {
                      const code = lg.product_ID || lg.product_code || "";
                      const meta =
                        (code && productMap[code]) || {
                          name: lg.product_name || code || "Unknown",
                        };
                      return (
                        <TableRow key={lg.id}>
                          <TableCell>
                            {mode === "daily"
                              ? new Date(lg.created_at).toLocaleTimeString()
                              : new Date(lg.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{meta.name}</TableCell>
                          <TableCell>{lg.product_category || "N/A"}</TableCell>
                          <TableCell align="right">{lg.product_quantity}</TableCell>
                          <TableCell>{lg.product_unit || "N/A"}</TableCell>
                          <TableCell>{lg.product_action || "N/A"}</TableCell>
                          <TableCell>{lg.staff || "N/A"}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </div>
    </Container>
  );
};

export default DTR;