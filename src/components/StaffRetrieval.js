import React, { useState } from "react";
import {
  Button,
  Form,
  Table,
  Alert,
  InputGroup,
  FormControl,
  Card,
  Row,
  Col,
  Container,
} from "react-bootstrap";
import { supabase } from "../supabaseClient";
import RetrievalLogs from "./retrievalLogs";
import BarcodeModal from "./barcode-modal";
import { LuScanBarcode } from "react-icons/lu";

const StaffRetrieval = ({
  staffId: initialStaffId = "",
  staffName: initialStaffName = "",
  setRender,
}) => {
  const [staffQR, setStaffQR] = useState(initialStaffId || "");
  const [staffName, setStaffName] = useState(initialStaffName || "");
  const [barcode, setBarcode] = useState("");
  const [items, setItems] = useState([]); // { product_id, product_name, qty, unit, stock }
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [barcodeModalShow, setBarcodeModalShow] = useState(false);
  const [productId, setProductId] = useState("");

  // staff QR scanner modal state
  const [staffScannerShow, setStaffScannerShow] = useState(false);

  const lookupStaff = async (id) => {
    try {
      const { data: staff, error } = await supabase
        .from("staff")
        .select("staff_name, id, staff_barcode")
        .eq("staff_barcode", id)
        .single();
      if (!error && staff) setStaffName(staff.staff_name || "");
      if (!error && staff) setStaffQR(staff.id || "");
    } catch (e) {
      console.error("lookupStaff", e);
    }
  };

  // called by the QR modal when a staff QR is scanned
  const handleStaffScanned = async (scannedId) => {
    if (!scannedId) return;

    let { data: staff, error } = await supabase
      .from("staff")
      .select("id")
      .eq("staff_barcode", scannedId)
      .single();

    if (error) {
      alert("Staff not found");
      return;
    }

    setStaffQR(staff);
    await lookupStaff(scannedId);
    setStaffScannerShow(false);
  };

  const clearStaff = () => {
    setStaffQR("");
    setStaffName("");
    setError("");
    setSuccess("");
  };

  const handleScanStaffQR = async (e) => {
    e && e.preventDefault();
    setError("");
    if (!staffQR) return setError("Please scan / enter staff QR (staff id).");
    await lookupStaff(staffQR);
  };

  const handleAddBarcode = async (e) => {
    e && e.preventDefault();
    setError("");
    setSuccess("");
    const code = (barcode || "").trim();
    if (!code) return setError("Enter a barcode first.");
    // prevent duplicates: add one more to existing if exists
    const existing = items.find((it) => it.product_id === code);
    if (existing) {
      setItems(
        items.map((it) =>
          it.product_id === code ? { ...it, qty: it.qty + 1 } : it
        )
      );
      setBarcode("");
      return;
    }

    try {
      const { data: product, error } = await supabase
        .from("main_stock_room_products")
        .select("id, product_ID, product_name, product_unit, product_quantity")
        .eq("product_ID", code)
        .single();

      if (error) return setError("Product not found for barcode: " + code);

      setItems([
        ...items,
        {
          uuid: product.id,
          product_id: product.product_ID,
          product_name: product.product_name,
          unit: product.product_unit,
          qty: 1,
          stock: product.product_quantity ?? 0,
        },
      ]);
      setBarcode("");
    } catch (e) {
      console.error(e);
      setError("Failed to fetch product.");
    }
  };

  const updateQty = (product_id, newQty) => {
    setItems(
      items.map((it) =>
        it.product_id === product_id ? { ...it, qty: Number(newQty) } : it
      )
    );
  };

  const removeItem = (product_id) => {
    setItems(items.filter((it) => it.product_id !== product_id));
  };

  const handleConfirm = async () => {
    setError("");
    setSuccess("");
    if (!staffQR && !staffName)
      return setError("Staff identification required. Scan QR first.");
    if (items.length === 0) return setError("No items added.");

    // validate quantities (check only; do NOT change stock here — secretary/admin will confirm)
    for (const it of items) {
      if (!it.qty || it.qty <= 0)
        return setError(
          `Invalid quantity for ${it.product_name || it.product_id}`
        );
      if (it.stock < it.qty)
        return setError(
          `Insufficient stock for ${it.product_name || it.product_id}`
        );
    }

    setLoading(true);
    try {
      const timestamp = new Date().toLocaleString();

      // Insert a main_retrievals record (transaction request) without modifying stock.
      const retrievalRow = {
        staff_id: staffQR || null,
        staff_name: staffName || null,
        items: items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          qty: i.qty,
          unit: i.unit,
        })),
        retrieved_at: timestamp,
        status: "pending", // will be verified by Pharmacy Secretary
        secretary_processed: false,
      };

      // return the inserted row so we can reference its id in the request table
      const { data: insertedRetrieval, error: retrievalErr } = await supabase
        .from("main_retrievals")
        .insert([retrievalRow])
        .select()
        .single();
      if (retrievalErr) throw retrievalErr;

      // Create an explicit request record for the Pharmacy Secretary to verify
      // (table: request). The secretary UI will read from this table and update status.
      const requestRow = {
        retrieval_id: insertedRetrieval.id,
        staff_id: retrievalRow.staff_id,
        staff_name: retrievalRow.staff_name,
        items: retrievalRow.items,
        created_at: timestamp,
      };
      const { error: requestErr } = await supabase
        .from("requests")
        .insert([requestRow]);
      if (requestErr) throw requestErr;

      setSuccess(
        "Retrieval request saved. Pharmacy Secretary will verify the items."
      );
      setItems([]);
      if (setRender) setTimeout(() => setRender("Retrieval"), 800);
    } catch (e) {
      console.error("Confirm retrieval error", e);
      setError(
        "Failed to create retrieval request. Check console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------- Render (responsive) ----------
  return (
    <>
      <Container fluid className="py-4" style={{ background: "transparent" }}>
        <div className="d-flex justify-content-center">
          <div style={{ width: "100%", maxWidth: 1200, minWidth: 1000 }}>
            <Card className="shadow-sm">
              <Card.Body>
                <Row className="justify-content-center mb-3">
                  <Col xs={12} sm={10} md={8} lg={6}>
                    <Card className="text-center border-0">
                      <Card.Body>
                        <h5 className="mb-2">Scan / Enter Staff QR</h5>

                        <Button
                          variant="primary"
                          className="d-flex justify-content-center align-items-center mb-2 mx-auto"
                          style={{ width: 90, height: 90, borderRadius: 12 }}
                          onClick={() => setStaffScannerShow(true)}
                        >
                          <LuScanBarcode size={36} />
                        </Button>

                        <div className="w-100 mt-2">
                          {!staffName ? (
                            <Form onSubmit={handleScanStaffQR} className="d-flex gap-2">
                              <Form.Control
                                size="sm"
                                placeholder="Type staff QR / ID"
                                value={String(staffQR || "")}
                                onChange={(e) => setStaffQR(e.target.value)}
                                style={{ minWidth: 0 }}
                              />
                              <Button type="submit" size="sm" variant="outline-primary">
                                Set
                              </Button>
                            </Form>
                          ) : null}
                        </div>

                        <div className="mt-2" style={{ fontSize: 13 }}>
                          {staffName ? (
                            <>
                              <div>Staff: <strong>{staffName}</strong></div>
                              <Button size="sm" variant="outline-danger" className="mt-2" onClick={clearStaff}>
                                Clear Staff
                              </Button>
                            </>
                          ) : (
                            <div style={{ fontSize: 12, color: "#666" }}>
                              Tap scan button or type staff QR to begin
                            </div>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {staffScannerShow && (
                  <BarcodeModal
                    show={staffScannerShow}
                    setBarcodeModalShow={setStaffScannerShow}
                    setProductId={handleStaffScanned}
                  />
                )}
                {barcodeModalShow && (
                  <BarcodeModal
                    show={barcodeModalShow}
                    setBarcodeModalShow={setBarcodeModalShow}
                    setProductId={setBarcode}
                  />
                )}

                {!staffName ? (
                  <div className="text-center text-muted my-4">
                    Please scan staff QR to reveal retrieval form and start adding items.
                  </div>
                ) : (
                  <>
                    <h4 className="mt-3">Staff — Retrieve Items (Main Stock Room)</h4>

                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}

                    <Form onSubmit={handleAddBarcode} className="mb-3">
                      <Form.Label>Scan / Enter Product Barcode</Form.Label>
                      <InputGroup className="mb-2" style={{ gap: 8, flexWrap: "wrap" }}>
                        <FormControl
                          placeholder="Scan barcode or type product code and press Add"
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          autoFocus
                          style={{ flex: 1, minWidth: 0 }}
                        />
                        <div className="d-flex" style={{ gap: 8 }}>
                          <Button variant="outline-secondary" onClick={() => setBarcodeModalShow(true)}>
                            <LuScanBarcode />
                          </Button>
                          <Button type="submit" variant="outline-success">
                            Add
                          </Button>
                        </div>
                      </InputGroup>
                      <div className="form-text mb-2">
                        You can scan multiple barcodes. Duplicate scans increase quantity.
                      </div>

                      <div className="table-responsive mb-3">
                        <Table striped bordered hover size="sm" className="mb-0">
                          <thead>
                            <tr>
                              <th>Barcode</th>
                              <th>Product</th>
                              <th>Unit</th>
                              <th style={{ width: 120 }}>Qty</th>
                              <th>Stock</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.length === 0 && (
                              <tr>
                                <td colSpan="6" className="text-center text-muted">
                                  No items added
                                </td>
                              </tr>
                            )}
                            {items.map((it) => (
                              <tr key={it.product_id}>
                                <td style={{ whiteSpace: "nowrap" }}>{it.product_id}</td>
                                <td style={{ minWidth: 120 }}>{it.product_name}</td>
                                <td>{it.unit}</td>
                                <td style={{ width: 120 }}>
                                  <Form.Control
                                    type="number"
                                    min="1"
                                    value={it.qty}
                                    onChange={(e) => updateQty(it.product_id, e.target.value)}
                                  />
                                </td>
                                <td>{it.stock}</td>
                                <td>
                                  <Button size="sm" variant="danger" onClick={() => removeItem(it.product_id)}>
                                    Remove
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>

                      <div className="d-flex flex-wrap gap-2">
                        <Button variant="primary" onClick={handleConfirm} disabled={loading}>
                          {loading ? "Processing..." : "OK — Confirm Retrieval"}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setItems([]);
                            setError("");
                            setSuccess("");
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </Form>
                  </>
                )}
              </Card.Body>
            </Card>
          </div>
        </div>

        {staffName ? (
          <div className="d-flex justify-content-center mt-4">
            <div style={{ width: "100%", maxWidth: 1200, minWidth: 1000 }}>
              <Card className="shadow-sm">
                <Card.Body>
                  <RetrievalLogs staffId={staffQR || initialStaffId} limit={20} />
                </Card.Body>
              </Card>
            </div>
          </div>
        ) : null}
      </Container>
    </>
  );
};

export default StaffRetrieval;
