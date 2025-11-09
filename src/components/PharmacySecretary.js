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
        start = new Date(s.getFullYear(), s.getMonth(), s.getDate()).toISOString();
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
          });
        }
        map.get(id).items.push(row);
      });

      const arr = Array.from(map.values()).sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });

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
      reportRange === "weekly" ? "Weekly" : reportRange === "monthly" ? "Monthly" : "Daily";
    const title = `${rangeLabel} Confirmed Retrievals - ${new Date().toLocaleDateString()}`;
    const escapeHtml = (s) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    let html = `
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body { 
              font-family: monospace; 
              width: 80mm; 
              margin: auto; 
              font-size: 12px;
              padding: 10px;
            }
            h4 { 
              text-align: center; 
              margin: 8px 0 5px 0;
              font-size: 16px;
              font-weight: bold;
            }
            hr { 
              border: none; 
              border-top: 1px dashed #000; 
              margin: 8px 0; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 6px 0; 
            }
            th, td { 
              font-size: 11px; 
              padding: 3px 2px;
              vertical-align: top;
            }
            th { 
              text-align: left; 
              font-weight: bold;
              border-bottom: 1px solid #333;
            }
            td {
              border-bottom: 1px dotted #ccc;
            }
            p { 
              margin: 3px 0;
              font-size: 11px;
            }
            .group { 
              margin-bottom: 12px;
              page-break-inside: avoid;
            }
            .group-header {
              background: #f5f5f5;
              padding: 4px;
              margin: 6px 0 4px 0;
              border-left: 3px solid #333;
            }
            .group-number {
              font-weight: bold;
              font-size: 12px;
            }
            .status-badge {
              display: inline-block;
              padding: 1px 4px;
              font-size: 10px;
              background: #e8e8e8;
              border-radius: 2px;
            }
            .no-print { 
              display: flex; 
              justify-content: center; 
              margin-top: 12px; 
              gap: 8px; 
            }
            .no-print button { 
              padding: 8px 16px; 
              cursor: pointer;
              border: 1px solid #333;
              background: white;
              font-family: monospace;
              font-size: 12px;
            }
            .no-print button:hover {
              background: #f0f0f0;
            }
            .summary {
              text-align: center;
              margin-top: 8px;
              font-weight: bold;
            }
            @media print { 
              .no-print { display: none !important; }
              body { padding: 5mm; }
            }
          </style>
        </head>
        <body>
          <h4>🐾 Pet Matters</h4>
          <p style="text-align:center;margin:0;font-size:10px;">123 Main St, City</p>
          <p style="text-align:center;margin:0;font-size:10px;">Tel: 0999-999-9999</p>
          <hr />
          <p><b>RETRIEVAL REPORT</b></p>
          <p><b>Range:</b> ${escapeHtml(rangeLabel)}</p>
          <p><b>Date:</b> ${escapeHtml(new Date().toLocaleDateString())}</p>
          <p><b>Time:</b> ${escapeHtml(new Date().toLocaleTimeString())}</p>
          <p><b>Staff:</b> ${escapeHtml(staffName || "Secretary")}</p>
          <hr />
    `;

    if (!reportRows || reportRows.length === 0) {
      html += `<p style="text-align:center;margin:20px 0;">No confirmed retrievals for today.</p>`;
    } else {
      let totalItems = 0;
      
      // Start one big table
      html += `<table>
        <thead>
          <tr>
            <th align="left" style="width:10%">Ret#</th>
            <th align="left" style="width:45%">Product</th>
            <th align="center" style="width:10%">Qty</th>
            <th align="left" style="width:20%">Status</th>
            <th align="left" style="width:15%">Secretary</th>
          </tr>
        </thead>
        <tbody>`;
      
      reportRows.forEach((group, idx) => {
        const items = group.items || [];
        totalItems += items.length;
        const secretary = escapeHtml(group.secretary_name || group.secretary_id || "N/A");
        
        items.forEach((it, itemIdx) => {
          const statusLabel = it.status === 'pharmacy_stock' ? 'Stock' : 
                            it.status === 'sold' ? 'Sold' : 
                            it.status === 'returned' ? 'Returned' : it.status;
          
          html += `<tr>`;
          
          // Show retrieval number only on first item of each group
          if (itemIdx === 0) {
            html += `<td rowspan="${items.length}" style="font-weight:bold;vertical-align:top;border-right:2px solid #333;">#${escapeHtml(group.retrieval_id)}</td>`;
          }
          
          html += `
            <td style="font-size:10px;">${escapeHtml(it.product_name)}</td>
            <td align="center"><b>${escapeHtml(it.qty ?? it.quantity ?? "-")}</b></td>
            <td><span class="status-badge">${escapeHtml(statusLabel)}</span></td>`;
          
          // Show secretary only on first item of each group
          if (itemIdx === 0) {
            html += `<td rowspan="${items.length}" style="font-size:10px;vertical-align:top;">${secretary}</td>`;
          }
          
          html += `</tr>`;
        });
        
        // Add separator row between retrievals
        if (idx < reportRows.length - 1) {
          html += `<tr><td colspan="5" style="border-bottom:2px solid #000;padding:0;"></td></tr>`;
        }
      });
      
      html += `</tbody></table>`;
      
      html += `<hr style="border-top:2px solid #000;" />`;
      html += `<p class="summary">Total Retrievals: ${reportRows.length} | Total Items: ${totalItems}</p>`;
    }

    html += `
          <hr />
          <p style="text-align:center;font-size:10px;margin-top:8px;">*** End of Report ***</p>
          <p style="text-align:center;font-size:9px;color:#666;">Thank you!</p>
          <div class="no-print">
            <button onclick="window.print()">🖨️ Print</button>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
      </html>
    `;

      // Fallback: print in same window using iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
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
                  {processingId === r.id
                    ? "Processing..."
                    : "Confirm"}
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

      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Today's Confirmed Retrievals</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-2 d-flex gap-2 align-items-center">
            <Form.Label className="mb-0" style={{ fontWeight: 600, marginRight: 8 }}>Range:</Form.Label>
            <Form.Select
              value={reportRange}
              onChange={(e) => setReportRange(e.target.value)}
              style={{ width: 160 }}
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
              style={{ marginLeft: 8 }}
            >
              Refresh
            </Button>
          </div>

          {reportRows.length === 0 ? (
            <div className="text-muted">No confirmed retrievals for today.</div>
          ) : (
            reportRows.map((group) => (
              <div key={group.retrieval_id} className="mb-3">
                <div><strong>Retrieval:</strong> {group.retrieval_id} — Secretary: {group.secretary_name || group.secretary_id}</div>
                <Table size="sm" striped bordered className="mt-2">
                  <thead>
                    <tr>
                      <th>Barcode</th>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Status</th>
                      <th>Added At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(group.items || []).map((it, idx) => (
                      <tr key={it.id ?? idx}>
                        <td>{it.product_id}</td>
                        <td>{it.product_name}</td>
                        <td>{it.qty ?? it.quantity ?? "-"}</td>
                        <td>{it.status}</td>
                        <td>{it.created_at ? new Date(it.created_at).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ))
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReportModal(false)}>Close</Button>
          <Button variant="primary" onClick={printReport} disabled={reportRows.length === 0}>Print</Button>
        </Modal.Footer>
      </Modal>

      <ConfirmedRetrievals staffId={staffCode} staffName={staffName} limit={50} />
    </>
  );
};

export default PharmacySecretary;