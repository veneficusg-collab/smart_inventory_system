import React, { useEffect, useState } from "react";
import {
  Container,
  Table,
  Button,
  Form,
  Alert,
  Spinner,
  Modal,
} from "react-bootstrap";
import { supabase } from "../supabaseClient";
import ConfirmedRetrievals from "./confirmedRetrievals";

const STATUS_OPTIONS = [
  { value: "pharmacy_stock", label: "For Pharmacy Stock (Pending)" },
  { value: "sold", label: "Sold" },
  { value: "returned", label: "Returned" },
];

const PharmacySecretary = ({ staffId = "", staffName = "", setRender }) => {
  const [retrievals, setRetrievals] = useState([]); // each has id, staff_id, staff_name, items[]
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [staffCode, setStaffCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // report state
  const [reportRows, setReportRows] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportRange, setReportRange] = useState("daily"); // "daily" | "weekly" | "monthly"

  useEffect(() => {
    fetchPendingRetrievals();
    fetchStaffCode(staffId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  const fetchStaffCode = async (id) => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("staff_barcode")
        .eq("id", id)
        .single();
      if (!error && data) setStaffCode(data.staff_barcode || "");
    } catch (e) {
      console.error("fetchStaffCode", e);
    }
  };

  const fetchPendingRetrievals = async () => {
    setLoading(true);
    try {
      // first collect retrieval_ids that already have entries in pharmacy_waiting
      const { data: waitingData, error: waitErr } = await supabase
        .from("pharmacy_waiting")
        .select("retrieval_id");
      if (waitErr) throw waitErr;
      const excludeIds = Array.from(
        new Set((waitingData || []).map((w) => w.retrieval_id))
      ).filter(Boolean);

      // fetch retrievals awaiting secretary verification (exclude those that already exist in pharmacy_waiting)
      let q = supabase
        .from("main_retrievals")
        .select("*")
        .in("status", ["pending", "pending_secretary"])
        .order("retrieved_at", { ascending: false });

      if (excludeIds.length > 0) {
        // supabase expects in-list as "(1,2,3)"
        q = q.not("id", "in", `(${excludeIds.join(",")})`);
      }

      const { data, error } = await q;
      if (error) throw error;

      // normalize local structure and add per-item status default
      const withStatus = (data || []).map((r) => ({
        ...r,
        items: (r.items || []).map((it) => ({
          ...it,
          status: it.status || "pharmacy_stock",
        })),
      }));
      setRetrievals(withStatus);
    } catch (e) {
      console.error("fetchPendingRetrievals", e);
      setError("Failed to load pending retrievals.");
      setRetrievals([]);
    } finally {
      setLoading(false);
    }
  };

  const setItemStatus = (retrievalId, productId, status) => {
    setRetrievals((prev) =>
      prev.map((r) =>
        r.id === retrievalId
          ? {
              ...r,
              items: r.items.map((it) =>
                it.product_id === productId ? { ...it, status } : it
              ),
            }
          : r
      )
    );
  };

  const moveToWaiting = async (retrieval) => {
    setError("");
    setSuccess("");
    setProcessingId(retrieval.id);

    try {
      const now = new Date().toISOString();

      // Build waiting rows using the item's qty and secretary-selected status.
      const waitingRows = (retrieval.items || []).map((it) => ({
        retrieval_id: retrieval.id,
        product_id: it.product_id,
        product_name: it.product_name,
        quantity: it.qty,
        status: it.status || "pharmacy_stock",
        secretary_id: staffCode || null,
        secretary_name: staffName || null,
        created_at: now,
        admin_confirmed: false, // admin will confirm later
        secretary_confirmed: true, // secretary already checked (still pending admin)
        product_uuid: it.product_uuid || it.uuid || null,
      }));

      // insert waiting rows (no stock changes here)
      const { error: waitErr } = await supabase
        .from("pharmacy_waiting")
        .insert(waitingRows);
      if (waitErr) throw waitErr;

      // mark retrieval as processed by secretary but pending admin
      const { error: updErr } = await supabase
        .from("main_retrievals")
        .update({
          secretary_processed: true,
          secretary_processed_at: now,
          status: "pending_admin",
        })
        .eq("id", retrieval.id);
      if (updErr)
        console.warn("failed to flag main_retrievals processed", updErr);

      // notify admin with a minimal summary (pending confirmation)
      const notifPayload = {
        retrieval_id: retrieval.id,
        staff_id: retrieval.staff_id,
        staff_name: retrieval.staff_name,
        processed_by: staffName || staffId || "Secretary",
        items: waitingRows.map((w) => ({
          product_id: w.product_id,
          qty: w.qty,
          status: w.status,
        })),
        timestamp: now,
        note: "Pending admin confirmation",
      };

      const { error: notifErr } = await supabase.from("notifications").insert([
        {
          target_role: "admin",
          title: `Pending Retrieval — ${retrieval.id}`,
          body: JSON.stringify(notifPayload),
          read: false,
        },
      ]);
      if (notifErr) console.warn("notification insert issue:", notifErr);

      // remove moved retrieval from local list so UI re-renders immediately (no full refresh)
      setRetrievals((prev) => prev.filter((r) => r.id !== retrieval.id));
      setSuccess("Items moved to waiting list (pending admin confirmation).");
    } catch (e) {
      console.error("moveToWaiting error", e);
      setError("Failed to move items to waiting. See console.");
    } finally {
      setProcessingId(null);
    }
  };

  // new: fetch confirmed retrievals for a given range and show printable modal
  const generateReport = async (range = "daily") => {
    setError("");
    setSuccess("");
    setReportLoading(true);
    setReportRange(range);
    try {
      const today = new Date();
      let start, end;

      if (range === "weekly") {
        // last 7 days (including today)
        const s = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 6
        );
        start = new Date(
          s.getFullYear(),
          s.getMonth(),
          s.getDate()
        ).toISOString();
        end = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1
        ).toISOString();
      } else if (range === "monthly") {
        const s = new Date(today.getFullYear(), today.getMonth(), 1);
        const e = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        start = s.toISOString();
        end = e.toISOString();
      } else {
        // daily
        start = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        ).toISOString();
        end = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1
        ).toISOString();
      }

      const { data: entries, error: e } = await supabase
        .from("pharmacy_waiting")
        .select("*")
        .eq("admin_confirmed", true)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false });

      if (e) throw e;

      // group by retrieval_id
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
            staff_name: null, // will populate below
          });
        }
        map.get(id).items.push(row);
      });

      const arr = Array.from(map.values()).sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });

      // fetch staff_name for each retrieval from main_retrievals (if available)
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
      setError("Failed to generate report.");
    } finally {
      setReportLoading(false);
    }
  };

  // new: print the report modal contents by opening a new window (prettier receipt style)
  const printReport = () => {
    const rangeLabel =
      reportRange === "weekly"
        ? "Weekly"
        : reportRange === "monthly"
        ? "Monthly"
        : "Daily";
    const title = `${rangeLabel} Confirmed Retrievals - ${new Date().toLocaleDateString()}`;
    const escapeHtml = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

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
      font-size: 12pt;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header h2 { margin: 8px 0; font-size: 20pt; }
    .header p { margin: 4px 0; font-size: 11pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11pt; }
    th, td { padding: 8px 6px; text-align: left; border-bottom: 1px solid #ccc; }
    th { font-weight: bold; background: #f0f0f0; font-size: 11pt; }
    .separator { border: none; height: 12px; }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px solid #000;
      font-size: 11pt;
    }
    .summary { margin-top: 15px; font-weight: bold; font-size: 12pt; }
    .no-print { margin-top: 20px; text-align: center; }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>🐾 Pet Matters</h2>
    <p>123 Main St, City</p>
    <p>Tel: 0999-999-9999</p>
    <p style="margin-top:10px; font-weight:bold; font-size:14pt;">RETRIEVAL REPORT</p>
    <p>Range: ${escapeHtml(rangeLabel)}</p>
    <p>Date: ${escapeHtml(new Date().toLocaleDateString())}</p>
    <p>Time: ${escapeHtml(new Date().toLocaleTimeString())}</p>
    <p>Staff (retrieval): ${escapeHtml(staffName || "Secretary")}</p>
  </div>
`;

    if (!reportRows || reportRows.length === 0) {
      html += `<div style="text-align:center; padding:20px; font-size:11pt;">No confirmed retrievals for this period.</div>`;
    } else {
      let totalItems = 0;

      // Start one big table
      html += `<table>
        <thead>
          <tr>
            <th>Ret#</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Staff</th>
            <th>Secretary</th>
          </tr>
        </thead>
        <tbody>`;

      reportRows.forEach((group, idx) => {
        const items = group.items || [];
        totalItems += items.length;
        const secretary = escapeHtml(
          group.secretary_name || group.secretary_id || "N/A"
        );
        const staffOfRetrieval = escapeHtml(group.staff_name || "N/A");

        items.forEach((it, itemIdx) => {
          const statusLabel =
            it.status === "pharmacy_stock"
              ? "Stock"
              : it.status === "sold"
              ? "Sold"
              : it.status === "returned"
              ? "Returned"
              : it.status;

          html += `<tr>`;

          // Show retrieval number only on first item of each group
          if (itemIdx === 0) {
            html += `<td rowspan="${items.length}" style="font-weight:bold;vertical-align:top;">#${escapeHtml(
              group.retrieval_id
            )}</td>`;
          }

          html += `
            <td>${escapeHtml(it.product_name)}</td>
            <td>${escapeHtml(it.qty ?? it.quantity ?? "-")}</td>
            <td>${escapeHtml(statusLabel)}</td>
            `;

          // show staff name (retrieval owner)
          if (itemIdx === 0) {
            html += `<td rowspan="${items.length}" style="vertical-align:top;">${staffOfRetrieval}</td>`;
          }

          // Show secretary only on first item of each group
          if (itemIdx === 0) {
            html += `<td rowspan="${items.length}" style="vertical-align:top;">${secretary}</td>`;
          }

          html += `</tr>`;
        });

        // Add separator row between retrievals
        if (idx < reportRows.length - 1) {
          html += `<tr class="separator"><td colspan="6"></td></tr>`;
        }
      });

      html += `</tbody></table>`;

      html += `<div class="summary">Total Retrievals: ${reportRows.length} | Total Items: ${totalItems}</div>`;
    }

    html += `
  <div class="footer">
    <p>*** End of Report ***</p>
    <p>Thank you!</p>
  </div>
  <div class="no-print">
    <button onclick="window.print()" style="padding:10px 20px; font-size:12pt; cursor:pointer;">🖨️ Print</button>
    <button onclick="window.close()" style="padding:10px 20px; font-size:12pt; cursor:pointer; margin-left:10px;">Close</button>
  </div>
</body>
</html>`;

    // Fallback: print in same window using iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        // Remove iframe after printing
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      } catch (err) {
        console.error("iframe print error", err);
        setError("Print failed. Please try again.");
      }
    };
  };

  if (loading)
    return (
      <div className="p-4">
        <Spinner animation="border" /> Loading...
      </div>
    );

  return (
    <>
      <Container
        fluid
        className="bg-white m-4 p-3 rounded"
        style={{ width: "140vh" }}
      >
        <h4>Pharmacy Secretary — Verify Incoming Items</h4>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <div className="mb-3">
          <Form.Select
            value={reportRange}
            onChange={(e) => setReportRange(e.target.value)}
            style={{ width: 180, display: "inline-block", marginRight: 8 }}
            size="sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Form.Select>
          <Button
            variant="primary"
            onClick={() => generateReport(reportRange)}
            disabled={reportLoading}
          >
            {reportLoading ? "Preparing..." : "Print Retrievals"}
          </Button>{" "}
          <Button variant="secondary" onClick={() => fetchPendingRetrievals()}>
            Refresh
          </Button>
        </div>

        {retrievals.length === 0 && (
          <div className="text-muted">No pending retrievals.</div>
        )}

        {retrievals.map((r) => (
          <div key={r.id} className="mb-4 border rounded p-2 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <strong>Retrieval:</strong> {r.id} — Staff:{" "}
                {r.staff_name || r.staff_id} —{" "}
                <small className="text-muted">at {r.retrieved_at}</small>
              </div>
              <div>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => moveToWaiting(r)}
                  disabled={processingId === r.id}
                >
                  {processingId === r.id ? "Processing..." : "Confirm"}
                </Button>{" "}
              </div>
            </div>

            <Table size="sm" bordered>
              <thead>
                <tr>
                  <th>Barcode</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Status (select)</th>
                </tr>
              </thead>
              <tbody>
                {(r.items || []).map((it) => (
                  <tr key={it.product_id}>
                    <td>{it.product_id}</td>
                    <td>{it.product_name}</td>
                    <td>{it.qty ?? it.quantity ?? "-"}</td>
                    <td>
                      <Form.Select
                        value={it.status || "pharmacy_stock"}
                        onChange={(e) =>
                          setItemStatus(r.id, it.product_id, e.target.value)
                        }
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Form.Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ))}
      </Container>

      <Modal
        show={showReportModal}
        onHide={() => setShowReportModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1.5rem' }}>Confirmed Retrievals Report</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: '1.1rem' }}>
          <div className="mb-3 d-flex gap-2 align-items-center">
            <Form.Label
              className="mb-0"
              style={{ fontWeight: 600, marginRight: 8, fontSize: '1.1rem' }}
            >
              Range:
            </Form.Label>
            <Form.Select
              value={reportRange}
              onChange={(e) => setReportRange(e.target.value)}
              style={{ width: 160, fontSize: '1rem' }}
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
              style={{ marginLeft: 8, fontSize: '1rem' }}
            >
              Refresh
            </Button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '15px' }}>
            <h4 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>🐾 Pet Matters</h4>
            <p style={{ fontSize: '1rem', margin: '2px 0' }}>123 Main St, City</p>
            <p style={{ fontSize: '1rem', margin: '2px 0' }}>Tel: 0999-999-9999</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '10px' }}>RETRIEVAL REPORT</p>
            <p style={{ fontSize: '1rem' }}>Range: {reportRange === "weekly" ? "Weekly" : reportRange === "monthly" ? "Monthly" : "Daily"}</p>
            <p style={{ fontSize: '1rem' }}>Date: {new Date().toLocaleDateString()}</p>
            <p style={{ fontSize: '1rem' }}>Staff: {staffName || "Secretary"}</p>
          </div>

          {reportRows.length === 0 ? (
            <div className="text-muted" style={{ fontSize: '1.1rem', textAlign: 'center' }}>No confirmed retrievals for this period.</div>
          ) : (
            <>
              <Table bordered hover style={{ fontSize: '1rem' }}>
                <thead style={{ backgroundColor: '#f0f0f0' }}>
                  <tr>
                    <th style={{ padding: '10px', fontSize: '1.1rem' }}>Ret#</th>
                    <th style={{ padding: '10px', fontSize: '1.1rem' }}>Product</th>
                    <th style={{ padding: '10px', fontSize: '1.1rem' }}>Qty</th>
                    <th style={{ padding: '10px', fontSize: '1.1rem' }}>Status</th>
                    <th style={{ padding: '10px', fontSize: '1.1rem' }}>Staff</th>
                    <th style={{ padding: '10px', fontSize: '1.1rem' }}>Secretary</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((group, idx) => {
                    const items = group.items || [];
                    const secretary = group.secretary_name || group.secretary_id || "N/A";
                    const staffOfRetrieval = group.staff_name || "N/A";
                    
                    return items.map((it, itemIdx) => {
                      const statusLabel =
                        it.status === 'pharmacy_stock'
                          ? 'Stock'
                          : it.status === 'sold'
                          ? 'Sold'
                          : it.status === 'returned'
                          ? 'Returned'
                          : it.status;
                      
                      return (
                        <tr key={`${group.retrieval_id}-${itemIdx}`}>
                          {itemIdx === 0 && (
                            <td rowSpan={items.length} style={{ padding: '10px', fontWeight: 'bold', verticalAlign: 'top', fontSize: '1rem' }}>
                              #{group.retrieval_id}
                            </td>
                          )}
                          <td style={{ padding: '10px', fontSize: '1rem' }}>{it.product_name}</td>
                          <td style={{ padding: '10px', fontSize: '1rem' }}>{it.qty ?? it.quantity ?? "-"}</td>
                          <td style={{ padding: '10px', fontSize: '1rem' }}>{statusLabel}</td>
                          {itemIdx === 0 && (
                            <>
                              <td rowSpan={items.length} style={{ padding: '10px', verticalAlign: 'top', fontSize: '1rem' }}>
                                {staffOfRetrieval}
                              </td>
                              <td rowSpan={items.length} style={{ padding: '10px', verticalAlign: 'top', fontSize: '1rem' }}>
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
              <div style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '1.1rem', borderTop: '2px solid #000', paddingTop: '15px' }}>
                Total Retrievals: {reportRows.length} | Total Items: {reportRows.reduce((sum, g) => sum + (g.items?.length || 0), 0)}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReportModal(false)} style={{ fontSize: '1rem' }}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={printReport}
            disabled={reportRows.length === 0}
            style={{ fontSize: '1rem' }}
          >
            🖨️ Print
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmedRetrievals
        staffId={staffCode}
        staffName={staffName}
        limit={50}
      />
    </>
  );
};

export default PharmacySecretary;