import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Spinner,
  Modal,
  Alert,
  Container,
  Form,
} from "react-bootstrap";
import { supabase } from "../supabaseClient";

const AdminPendingConfirmations = () => {
  const [groups, setGroups] = useState([]); // grouped by retrieval_id
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [processingAll, setProcessingAll] = useState(false);

  // report preview / printing state
  const [reportRows, setReportRows] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportRange, setReportRange] = useState("daily"); // "daily" | "weekly" | "monthly"

  const fetchPending = async () => {
    setLoading(true);
    setError("");
    try {
      // get waiting rows not yet confirmed by admin (only relevant statuses)
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
            staff_name: null, // will populate below
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

        // find product in main_stock_room_products by product_ID
        const { data: pByBarcode, error: pByBarcodeErr } = await supabase
          .from("main_stock_room_products")
          .select("*")
          .eq("product_ID", item.product_id)
          .limit(1);

        if (pByBarcodeErr) {
          console.error("product lookup error", pByBarcodeErr);
          continue;
        }
        const prod = (pByBarcode && pByBarcode.length && pByBarcode[0]) || null;
        if (!prod) {
          console.warn(`Product not found for item ${item.product_id}`);
          continue;
        }

        const currentQty = Number(prod.product_quantity ?? 0);
        const newQty = Math.max(0, currentQty - deductQty);

        const { error: updProdErr } = await supabase
          .from("main_stock_room_products")
          .update({ product_quantity: newQty })
          .eq("id", prod.id);

        if (updProdErr) {
          console.error("Failed updating product qty for", prod.id, updProdErr);
        }
      } catch (innerErr) {
        console.error("Error deducting product qty for item", item, innerErr);
      }
    }
  };

  const confirmGroup = async (retrievalId) => {
    setProcessingId(retrievalId);
    setError("");
    setSuccess("");
    try {
      const now = new Date().toISOString();
      // fetch waiting rows for this retrieval_id (still unconfirmed)
      const { data: waitingRows, error: fetchWaitErr } = await supabase
        .from("pharmacy_waiting")
        .select("*")
        .eq("retrieval_id", retrievalId)
        .eq("admin_confirmed", false);

      if (fetchWaitErr) throw fetchWaitErr;

      // deduct quantities for this group's items
      await _deductProductsForItems(waitingRows);

      // mark pharmacy_waiting rows for this retrieval_id as admin_confirmed
      const { error: updWaitErr } = await supabase
        .from("pharmacy_waiting")
        .update({ admin_confirmed: true })
        .eq("retrieval_id", retrievalId);
      if (updWaitErr) throw updWaitErr;

      // update main_retrievals status
      const { error: updMainErr } = await supabase
        .from("main_retrievals")
        .update({ status: "admin_confirmed" })
        .eq("id", retrievalId);
      if (updMainErr) console.warn("main_retrievals update warning:", updMainErr);

      // notify secretary/staff
      const notif = {
        target_role: "secretary",
        title: `Retrieval ${retrievalId} confirmed by admin`,
        body: JSON.stringify({ retrieval_id: retrievalId, confirmed_at: now }),
        read: false,
      };
      const { error: notifErr } = await supabase.from("notifications").insert([notif]);
      if (notifErr) console.warn("notification insert issue:", notifErr);

      setGroups((prev) => prev.filter((g) => g.retrieval_id !== retrievalId));
      if (selected && selected.retrieval_id === retrievalId) {
        setShowModal(false);
        setSelected(null);
      }
      setSuccess("Retrieval confirmed.");
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
      // We will process each group's items sequentially to reuse current logic and avoid race issues.
      const failed = [];
      for (const g of groups) {
        try {
          // fetch fresh waiting rows for this retrieval
          const { data: waitingRows, error: fetchWaitErr } = await supabase
            .from("pharmacy_waiting")
            .select("*")
            .eq("retrieval_id", g.retrieval_id)
            .eq("admin_confirmed", false);
          if (fetchWaitErr) throw fetchWaitErr;

          // deduct product stock for this group's items
          await _deductProductsForItems(waitingRows);

          // mark waiting rows confirmed
          const { error: updWaitErr } = await supabase
            .from("pharmacy_waiting")
            .update({ admin_confirmed: true })
            .eq("retrieval_id", g.retrieval_id);
          if (updWaitErr) throw updWaitErr;

          // update main_retrievals
          const { error: updMainErr } = await supabase
            .from("main_retrievals")
            .update({ status: "admin_confirmed" })
            .eq("id", g.retrieval_id);
          if (updMainErr) console.warn("main_retrievals update warning:", updMainErr);

          // notify per retrieval (optional)
          const notif = {
            target_role: "secretary",
            title: `Retrieval ${g.retrieval_id} confirmed by admin`,
            body: JSON.stringify({ retrieval_id: g.retrieval_id, confirmed_at: now }),
            read: false,
          };
          const { error: notifErr } = await supabase.from("notifications").insert([notif]);
          if (notifErr) console.warn("notification insert issue:", notifErr);
        } catch (innerErr) {
          console.error("confirmAll - failed for", g.retrieval_id, innerErr);
          failed.push(g.retrieval_id);
        }
      }

      // remove successfully processed groups from UI
      if (failed.length === 0) {
        setGroups([]);
        setSuccess("All pending retrievals confirmed.");
      } else {
        setGroups((prev) => prev.filter((g) => failed.includes(g.retrieval_id)));
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
      // fetch waiting rows for this retrieval_id (still unconfirmed)
      const {  error: fetchWaitErr } = await supabase
        .from("pharmacy_waiting")
        .select("*")
        .eq("retrieval_id", retrievalId)
        .eq("admin_confirmed", false);

      if (fetchWaitErr) throw fetchWaitErr;

      // mark pharmacy_waiting rows for this retrieval_id as admin_confirmed (we still mark so they are not reprocessed)
      const { error: updWaitErr } = await supabase
        .from("pharmacy_waiting")
        .update({
          admin_confirmed: true,
        })
        .eq("retrieval_id", retrievalId);
      if (updWaitErr) throw updWaitErr;

      // update main_retrievals status to declined
      const { error: updMainErr } = await supabase
        .from("main_retrievals")
        .update({
          status: "admin_declined",
        })
        .eq("id", retrievalId);
      if (updMainErr) console.warn("main_retrievals update warning:", updMainErr);

      // notify secretary/staff
      const notif = {
        target_role: "secretary",
        title: `Retrieval ${retrievalId} declined by admin`,
        body: JSON.stringify({
          retrieval_id: retrievalId,
          declined_at: now,
        }),
        read: false,
      };
      const { error: notifErr } = await supabase.from("notifications").insert([notif]);
      if (notifErr) console.warn("notification insert issue:", notifErr);

      setGroups((prev) => prev.filter((g) => g.retrieval_id !== retrievalId));
      if (selected && selected.retrieval_id === retrievalId) {
        setShowModal(false);
        setSelected(null);
      }
    } catch (e) {
      console.error("declineGroup", e);
      setError("Failed to decline retrieval. See console.");
    } finally {
      setProcessingId(null);
    }
  };

  // fetch confirmed retrievals for a given range and open preview modal
  const generateReport = async (range = "daily") => {
    setReportLoading(true);
    setError("");
    setReportRange(range);
    try {
      const today = new Date();
      let start, end;
      if (range === "weekly") {
        const s = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
        start = new Date(s.getFullYear(), s.getMonth(), s.getDate()).toISOString();
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      } else if (range === "monthly") {
        const s = new Date(today.getFullYear(), today.getMonth(), 1);
        const e = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        start = s.toISOString();
        end = e.toISOString();
      } else {
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
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
      setReportRows([]);
    } finally {
      setReportLoading(false);
    }
  };

  // print the current reportRows
  const printReport = () => {
    const rangeLabel = reportRange === "weekly" ? "Weekly" : reportRange === "monthly" ? "Monthly" : "Daily";
    const title = `${rangeLabel} Confirmed Retrievals - ${new Date().toLocaleDateString()}`;
    const escapeHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
 <div class="header">
    <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 12px;">
      <h2 style="font-size: 16pt; margin: 8px 0;">🐾 Pet Matters</h2>
      <div style="font-size: 9pt; margin: 2px 0;">123 Main St, City</div>
      <div style="font-size: 9pt; margin: 2px 0;">Tel: 0999-999-9999</div>
      <div style="font-size: 11pt; font-weight: bold; margin-top: 8px;">RETRIEVAL REPORT</div>
      <div style="font-size: 9pt; margin-top: 5px;">Range: ${escapeHtml(rangeLabel)}</div>
      <div style="font-size: 9pt;">Date: ${escapeHtml(new Date().toLocaleDateString())} | Time: ${escapeHtml(new Date().toLocaleTimeString())}</div>
    </div>
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
            html += `<td rowspan="${items.length}" style="font-weight:bold;text-align:center;">${escapeHtml(
              group.retrieval_id
            )}</td>`;
          }

          html += `
            <td>${escapeHtml(it.product_name)}</td>
            <td style="text-align:center;">${escapeHtml(it.qty ?? it.quantity ?? "-")}</td>
            <td style="text-align:center;">${escapeHtml(statusLabel)}</td>
            `;

          // show staff name (retrieval owner)
          if (itemIdx === 0) {
            html += `<td rowspan="${items.length}">${staffOfRetrieval}</td>`;
          }

          // Show secretary only on first item of each group
          if (itemIdx === 0) {
            html += `<td rowspan="${items.length}">${secretary}</td>`;
          }

          html += `</tr>`;
        });
      });

      html += `</tbody></table>`;

      html += `<div class="footer">Total Retrievals: ${reportRows.length} &nbsp; | &nbsp; Total Items: ${totalItems}</div>`;
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
            <Form.Select
              size="sm"
              value={reportRange}
              onChange={(e) => setReportRange(e.target.value)}
              style={{ width: 140, display: "inline-block", marginRight: 8 }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Form.Select>
            <Button
              size="sm"
              variant="primary"
              onClick={() => generateReport(reportRange)}
              disabled={reportLoading}
              className="me-2"
            >
              {reportLoading ? "Preparing..." : "Print Retrievals"}
            </Button>
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
              {processingAll ? "Confirming all..." : `Confirm All (${groups.length})`}
            </Button>
          </div>
        </div>

        {/* Report preview modal */}
        <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="xl" centered>
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
            <Button variant="secondary" onClick={() => setShowReportModal(false)} style={{ fontSize: '1rem' }}>Close</Button>
            <Button variant="primary" onClick={printReport} disabled={reportRows.length === 0} style={{ fontSize: '1rem' }}>🖨️ Print</Button>
          </Modal.Footer>
        </Modal>

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
                    {g.created_at ? new Date(g.created_at).toLocaleString() : "-"}
                  </td>
                  <td>{g.items[0]?.status}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openGroup(g)}
                      disabled={processingId === g.retrieval_id || processingAll}
                    >
                      View
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => declineGroup(g.retrieval_id)}
                      disabled={processingId === g.retrieval_id || processingAll}
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