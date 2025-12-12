// ...existing code...
import React, { useEffect, useState } from "react";
import { Table, Button, Container, Modal, Form, Badge } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const AdminRetrievalLogs = () => {
  const [retrievalLogs, setRetrievalLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("daily");

  // Report preview / printing state
  const [reportRows, setReportRows] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportRange, setReportRange] = useState("daily");

  const computeRange = (p) => {
    const now = new Date();
    if (p === "daily") {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 1);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (p === "weekly") {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      start.setUTCDate(start.getUTCDate() - start.getUTCDay());
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 7);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (p === "monthly") {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );
      const end = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
      );
      return { start: start.toISOString(), end: end.toISOString() };
    }
    return { start: null, end: null };
  };

  const fetchRetrievalLogs = async (p = period) => {
    setLoading(true);
    try {
      let q = supabase
        .from("main_retrievals")
        .select("id, staff_id, staff_name, items, retrieved_at, status")
        .order("retrieved_at", { ascending: false });

      const { start, end } = computeRange(p);
      if (start && end) {
        q = q.gte("retrieved_at", start).lt("retrieved_at", end);
      }

      const { data, error } = await q;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const renderItemsSummary = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) return "-";
    return items
      .map((it) => `${it.product_name || it.product_id} x${it.qty}`)
      .join(", ");
  };

  // Function to get status badge color and text - UPDATED TEXT
  const getStatusBadge = (status) => {
    if (!status) return <Badge bg="secondary">-</Badge>;

    const statusLower = status.toLowerCase();

    if (statusLower.includes("confirmed")) {
      return <Badge bg="success">Admin Confirmed</Badge>;
    }

    if (statusLower.includes("declined") || statusLower.includes("rejected")) {
      return <Badge bg="danger">Admin Declined</Badge>;
    }

    if (statusLower.includes("pending")) {
      return (
        <Badge bg="warning" text="dark">
          Admin Pending
        </Badge>
      );
    }

    // For other statuses, keep the original text
    return <Badge bg="secondary">{status}</Badge>;
  };

  // Generate report for confirmed retrievals (for modal)
  const generateReport = async (range = "daily") => {
    setReportLoading(true);
    setReportRange(range);
    try {
      const today = new Date();
      let start, end;
      if (range === "weekly") {
        const s = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate() - 6
          )
        );
        start = s.toISOString();
        end = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate() + 1
          )
        ).toISOString();
      } else if (range === "monthly") {
        start = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
        ).toISOString();
        end = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)
        ).toISOString();
      } else {
        start = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate()
          )
        ).toISOString();
        end = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate() + 1
          )
        ).toISOString();
      }

      const { data: entries, error } = await supabase
        .from("pharmacy_waiting")
        .select("*")
        .eq("admin_confirmed", true)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const map = new Map();
      (entries || []).forEach((row) => {
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

      setReportRows(arr);
      setShowReportModal(true);
    } catch (err) {
      console.error("generateReport", err);
      setReportRows([]);
    } finally {
      setReportLoading(false);
    }
  };

  // Print the current retrievalLogs data - SAME DATA AS LOGS TABLE
  const printRetrievalLogs = () => {
    const rangeLabel =
      period === "weekly"
        ? "Weekly"
        : period === "monthly"
        ? "Monthly"
        : period === "all"
        ? "All"
        : "Daily";
    
    const title = `${rangeLabel} Retrieval Logs - ${new Date().toLocaleDateString()}`;
    const escapeHtml = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Function to get status badge HTML for printing - SAME AS getStatusBadge
    const getStatusBadgeHtml = (status) => {
      if (!status) return '<span class="badge badge-secondary">-</span>';
      
      const statusLower = status.toLowerCase();
      let badgeClass = "badge-secondary";
      let badgeText = status;
      
      if (statusLower.includes('confirmed')) {
        badgeClass = "badge-success";
        badgeText = "Admin Confirmed";
      } else if (statusLower.includes('declined') || statusLower.includes('rejected')) {
        badgeClass = "badge-danger";
        badgeText = "Admin Declined";
      } else if (statusLower.includes('pending')) {
        badgeClass = "badge-warning";
        badgeText = "Admin Pending";
      }
      
      return `<span class="badge ${badgeClass}">${escapeHtml(badgeText)}</span>`;
    };

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    @media print {
      @page { margin: 0.75in; size: letter; }
      body { margin: 0; }
    }
    body {
      font-family: 'Arial', sans-serif;
      max-width: 7.5in;
      margin: 20px auto;
      padding: 20px;
      font-size: 10pt;
      line-height: 1.3;
    }
    .header {
      margin-bottom: 15px;
    }
    .header .date-line {
      font-size: 9pt;
      margin-bottom: 8px;
    }
    .header h2 {
      text-align: center;
      margin: 8px 0;
      font-size: 14pt;
      font-weight: bold;
    }
    .header .info-line {
      font-size: 9pt;
      margin: 2px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 9pt;
      border: 1px solid #000;
    }
    th, td {
      padding: 6px 8px;
      text-align: left;
      border: 1px solid #000;
    }
    th {
      font-weight: bold;
      background: #fff;
      font-size: 9pt;
      text-align: center;
    }
    td {
      vertical-align: top;
    }
    .footer {
      text-align: center;
      margin-top: 15px;
      font-size: 9pt;
      font-weight: bold;
    }
    .no-print {
      margin-top: 20px;
      text-align: center;
    }
    /* Badge styles for printing - SAME COLORS AS UI */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 600;
      line-height: 1;
      text-align: center;
      white-space: nowrap;
      vertical-align: baseline;
      border-radius: 4px;
    }
    .badge-success {
      background-color: #198754 !important;
      color: white !important;
    }
    .badge-danger {
      background-color: #dc3545 !important;
      color: white !important;
    }
    .badge-warning {
      background-color: #ffc107 !important;
      color: #000 !important;
    }
    .badge-secondary {
      background-color: #6c757d !important;
      color: white !important;
    }
    @media print {
      .no-print { display: none; }
      .badge-success, .badge-danger, .badge-warning, .badge-secondary {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
 <div class="header">
    <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 12px;">
      <h2 style="font-size: 16pt; margin: 8px 0;">🐾 Pet Matters</h2>
      <div style="font-size: 9pt; margin: 2px 0;">123 Main St, City</div>
      <div style="font-size: 9pt; margin: 2px 0;">Tel: 0999-999-9999</div>
      <div style="font-size: 11pt; font-weight: bold; margin-top: 8px;">RETRIEVAL LOGS REPORT</div>
      <div style="font-size: 9pt; margin-top: 5px;">Range: ${escapeHtml(
        rangeLabel
      )}</div>
      <div style="font-size: 9pt;">Date: ${escapeHtml(
        new Date().toLocaleDateString()
      )} | Time: ${escapeHtml(new Date().toLocaleTimeString())}</div>
    </div>
  </div>
`;

    if (!retrievalLogs || retrievalLogs.length === 0) {
      html += `<div style="text-align:center; padding:20px; font-size:11pt;">No retrieval logs found for this period.</div>`;
    } else {
      let totalRetrievals = retrievalLogs.length;

      html += `<table>
        <thead>
          <tr>
            <th style="width: 180px">Retrieval ID</th>
            <th>Staff</th>
            <th>Items (Summary)</th>
            <th style="width: 180px">Retrieved At</th>
            <th style="width: 120px">Status</th>
          </tr>
        </thead>
        <tbody>`;

      retrievalLogs.forEach((r) => {
        // Get items summary - SAME AS renderItemsSummary
        const itemsSummary = r.items && Array.isArray(r.items) && r.items.length > 0
          ? r.items
              .map((it) => `${it.product_name || it.product_id} x${it.qty}`)
              .join(", ")
          : "-";
        
        // Format date - SAME AS IN TABLE
        const retrievedDate = r.retrieved_at_local
          ? r.retrieved_at_local
          : r.retrieved_at
          ? new Date(r.retrieved_at).toLocaleString()
          : "-";
        
        html += `<tr>
          <td style="font-size: 11px">${escapeHtml(r.id || "N/A")}</td>
          <td>${escapeHtml(r.staff_name || r.staff_id || "N/A")}</td>
          <td style="max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(itemsSummary)}
          </td>
          <td>${escapeHtml(retrievedDate)}</td>
          <td>${getStatusBadgeHtml(r.status)}</td>
        </tr>`;
      });

      html += `</tbody></table>`;

      // Count status types for summary
      const confirmedCount = retrievalLogs.filter(r => r.status && r.status.toLowerCase().includes('confirmed')).length;
      const declinedCount = retrievalLogs.filter(r => r.status && (r.status.toLowerCase().includes('declined') || r.status.toLowerCase().includes('rejected'))).length;
      const pendingCount = retrievalLogs.filter(r => r.status && r.status.toLowerCase().includes('pending')).length;
      const otherCount = retrievalLogs.length - confirmedCount - declinedCount - pendingCount;

      html += `<div class="footer">
        Total Retrievals: ${totalRetrievals} 
        &nbsp; | &nbsp; 
        <span class="badge badge-success">Admin Confirmed: ${confirmedCount}</span>
        &nbsp; | &nbsp; 
        <span class="badge badge-danger">Admin Declined: ${declinedCount}</span>
        &nbsp; | &nbsp; 
        <span class="badge badge-warning">Admin Pending: ${pendingCount}</span>
        &nbsp; | &nbsp; 
        <span class="badge badge-secondary">Other: ${otherCount}</span>
      </div>`;
    }

    html += `<div class="no-print"><button onclick="window.print()" style="padding:10px 20px; font-size:10pt; cursor:pointer;">🖨️ Print</button><button onclick="window.close()" style="padding:10px 20px; font-size:10pt; cursor:pointer; margin-left:10px;">Close</button></div></body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1200);
      } catch (err) {
        console.error("print error", err);
      }
    };
  };

  // Separate print function for the modal (using reportRows)
  const printReport = () => {
    // This function prints the reportRows (pharmacy_waiting data)
    // You can keep this if you still want to print that format
    // But the main print button should use printRetrievalLogs()
  };

  return (
    <>
      <Container
        fluid
        className="bg-white m-4 rounded p-4"
        style={{ width: "140vh", height: "50vh", overflowY: "auto" }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div>
            <strong>Retrievals Logs</strong>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div style={{ display: "flex", gap: 6 }}>
              {/* Change this button to call printRetrievalLogs instead of generateReport */}
              <Button
                size="sm"
                variant="primary"
                onClick={printRetrievalLogs}
                className="me-2"
              >
                Print Retrievals
              </Button>
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
            <div>
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={() => fetchRetrievalLogs(period)}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Status Legend */}
        <div className="mb-3">
          <small className="text-muted">
            <strong>Status Legend:</strong>{" "}
            <Badge bg="success" className="ms-2 me-1">
              Admin Confirmed
            </Badge>
            <Badge bg="danger" className="mx-1">
              Admin Declined
            </Badge>
            <Badge bg="warning" text="dark" className="mx-1">
              Admin Pending
            </Badge>
            <Badge bg="secondary" className="mx-1">
              Other
            </Badge>
          </small>
        </div>

        {/* Report preview modal - This shows pharmacy_waiting data */}
        <Modal
          show={showReportModal}
          onHide={() => setShowReportModal(false)}
          size="xl"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title style={{ fontSize: "1.5rem" }}>
              Confirmed Retrievals Report
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ fontSize: "1.1rem" }}>
            <div className="mb-3 d-flex gap-2 align-items-center">
              <Form.Label
                className="mb-0"
                style={{ fontWeight: 600, marginRight: 8, fontSize: "1.1rem" }}
              >
                Range:
              </Form.Label>
              <Form.Select
                value={reportRange}
                onChange={(e) => setReportRange(e.target.value)}
                style={{ width: 160, fontSize: "1rem" }}
                size="sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Form.Select>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => generateReport(reportRange)}
                disabled={reportLoading}
                style={{ marginLeft: 8, fontSize: "1rem" }}
              >
                Refresh
              </Button>
            </div>

            <div
              style={{
                textAlign: "center",
                marginBottom: "20px",
                borderBottom: "2px solid #000",
                paddingBottom: "15px",
              }}
            >
              <h4 style={{ fontSize: "1.5rem", marginBottom: "10px" }}>
                🐾 Pet Matters
              </h4>
              <p style={{ fontSize: "1rem", margin: "2px 0" }}>
                123 Main St, City
              </p>
              <p style={{ fontSize: "1rem", margin: "2px 0" }}>
                Tel: 0999-999-9999
              </p>
              <p
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  marginTop: "10px",
                }}
              >
                CONFIRMED RETRIEVALS REPORT
              </p>
              <p style={{ fontSize: "1rem" }}>
                Range:{" "}
                {reportRange === "weekly"
                  ? "Weekly"
                  : reportRange === "monthly"
                  ? "Monthly"
                  : "Daily"}
              </p>
              <p style={{ fontSize: "1rem" }}>
                Date: {new Date().toLocaleDateString()}
              </p>
            </div>

            {reportRows.length === 0 ? (
              <div
                className="text-muted"
                style={{ fontSize: "1.1rem", textAlign: "center" }}
              >
                No confirmed retrievals for this period.
              </div>
            ) : (
              <>
                <Table bordered hover style={{ fontSize: "1rem" }}>
                  <thead style={{ backgroundColor: "#f0f0f0" }}>
                    <tr>
                      <th style={{ padding: "10px", fontSize: "1.1rem" }}>
                        Ret#
                      </th>
                      <th style={{ padding: "10px", fontSize: "1.1rem" }}>
                        Product
                      </th>
                      <th style={{ padding: "10px", fontSize: "1.1rem" }}>
                        Qty
                      </th>
                      <th style={{ padding: "10px", fontSize: "1.1rem" }}>
                        Status
                      </th>
                      <th style={{ padding: "10px", fontSize: "1.1rem" }}>
                        Staff
                      </th>
                      <th style={{ padding: "10px", fontSize: "1.1rem" }}>
                        Secretary
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((group) => {
                      const items = group.items || [];
                      const secretary =
                        group.secretary_name || group.secretary_id || "N/A";
                      const staffOfRetrieval = group.staff_name || "N/A";

                      return items.map((it, itemIdx) => {
                        const statusLabel =
                          it.status === "pharmacy_stock"
                            ? "Stock"
                            : it.status === "sold"
                            ? "Sold"
                            : it.status === "returned"
                            ? "Returned"
                            : it.status;

                        return (
                          <tr key={`${group.retrieval_id}-${itemIdx}`}>
                            {itemIdx === 0 && (
                              <td
                                rowSpan={items.length}
                                style={{
                                  padding: "10px",
                                  fontWeight: "bold",
                                  verticalAlign: "top",
                                  fontSize: "1rem",
                                }}
                              >
                                #{group.retrieval_id}
                              </td>
                            )}
                            <td style={{ padding: "10px", fontSize: "1rem" }}>
                              {it.product_name}
                            </td>
                            <td style={{ padding: "10px", fontSize: "1rem" }}>
                              {it.qty ?? it.quantity ?? "-"}
                            </td>
                            <td style={{ padding: "10px", fontSize: "1rem" }}>
                              {statusLabel}
                            </td>
                            {itemIdx === 0 && (
                              <>
                                <td
                                  rowSpan={items.length}
                                  style={{
                                    padding: "10px",
                                    verticalAlign: "top",
                                    fontSize: "1rem",
                                  }}
                                >
                                  {staffOfRetrieval}
                                </td>
                                <td
                                  rowSpan={items.length}
                                  style={{
                                    padding: "10px",
                                    verticalAlign: "top",
                                    fontSize: "1rem",
                                  }}
                                >
                                  {secretary}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </Table>
                <div
                  style={{
                    marginTop: "15px",
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                    borderTop: "2px solid #000",
                    paddingTop: "15px",
                  }}
                >
                  Total Retrievals: {reportRows.length} | Total Items:{" "}
                  {reportRows.reduce(
                    (sum, g) => sum + (g.items?.length || 0),
                    0
                  )}
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowReportModal(false)}
              style={{ fontSize: "1rem" }}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={printReport}
              disabled={reportRows.length === 0}
              style={{ fontSize: "1rem" }}
            >
              🖨️ Print
            </Button>
          </Modal.Footer>
        </Modal>

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
                  No retrievals found for this period
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
                  <td>{getStatusBadge(r.status)}</td>
                </tr>
              ))}
          </tbody>
        </Table>
      </Container>
    </>
  );
};

export default AdminRetrievalLogs;