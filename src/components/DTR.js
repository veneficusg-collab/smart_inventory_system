// DTR.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { Button, Container, Row, Col, Form, Nav } from "react-bootstrap";
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

const currency = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const DTR = () => {
  const printRef = useRef(null);

  const [mode, setMode] = useState("daily");
  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];
  const defaultMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const [date, setDate] = useState(defaultDate);
  const [month, setMonth] = useState(defaultMonth);
  const [staffRole, setStaffRole] = useState("");
  const [staffName, setStaffName] = useState("");
  const [productMap, setProductMap] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // ---------- helpers ----------
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

  const getRange = () => (mode === "daily" ? dayToRange(date) : monthToRange(month));

  const fetchData = async () => {
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
        .order("created_at", { ascending: true });

      let logQuery = supabase
        .from("logs")
        .select("*")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: true });

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
  }, [mode, date, month]);

  // ---------- summary ----------
  const summary = useMemo(() => {
    const completed = (transactions || []).filter((t) => t.status === "completed");
    const totalSales = completed.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const txCompleted = completed.length;
    const txVoided = (transactions || []).filter((t) => t.status === "voided").length;

    const itemsSoldByCode = {};
    (transactions || []).forEach((t) => {
      (t.transaction_items || []).forEach((it) => {
        itemsSoldByCode[it.product_code] =
          (itemsSoldByCode[it.product_code] || 0) + (Number(it.qty) || 0);
      });
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
  }, [transactions, productMap]);

  // ---------- Print (component only) ----------
  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>${mode === "daily" ? "Daily" : "Monthly"} Report</title>
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

  const rangeLabel =
    mode === "daily"
      ? new Date(date).toLocaleDateString()
      : new Date(`${month}-01`).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
        });

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
          </Nav>
        </Col>
      </Row>

      {/* Filters + Print */}
      <Row className="no-print mt-2">
        {mode === "daily" ? (
          <Col xs={12} md={4}>
            <Form.Label>Select Date</Form.Label>
            <Form.Control type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Col>
        ) : (
          <Col xs={12} md={4}>
            <Form.Label>Select Month</Form.Label>
            <Form.Control
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </Col>
        )}
        <Col xs={12} md={8} className="d-flex justify-content-end align-items-end">
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

      {/* PRINTABLE CONTENT */}
      <div ref={printRef}>
        <div className="text-center mt-3">
          <h5>🐾 Pet Matters</h5>
          <p style={{ margin: 0 }}>123 Main St, City | Tel: 0999-999-9999</p>
          <p style={{ margin: "2px 0" }}>
            <b>{mode === "daily" ? "Daily" : "Monthly"} Report — {rangeLabel}</b>
          </p>
        </div>

        {/* Summary */}
        <Row className="mt-3">
          <Col xs={12}>
            <div className="fw-bold">Summary</div>
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

        {/* Top Items */}
        <h6 className="fw-bold mt-3">Top 10 Sold Items</h6>
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

        {/* Transactions */}
        <h6 className="fw-bold">Transactions ({transactions.length})</h6>
        <TableContainer component={Paper} className="mb-3">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>{mode === "daily" ? "Time" : "Date"}</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Payments</TableCell>
                <TableCell>Staff</TableCell> {/* ✅ Staff column */}
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No transactions
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
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
                    <TableCell>{t.staff || "N/A"}</TableCell> {/* ✅ show staff */}
                    <TableCell>{t.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Logs */}
        <h6 className="fw-bold">Inventory Logs ({logs.length})</h6>
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
                <TableCell>Staff</TableCell> {/* ✅ Added Staff column */}
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No logs
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((lg) => {
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
                      <TableCell>{lg.staff || "N/A"}</TableCell> {/* ✅ show staff */}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </Container>
  );
};

export default DTR;
