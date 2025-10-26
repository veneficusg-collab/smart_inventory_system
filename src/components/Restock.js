import { useEffect, useState } from "react";
import { Container, Row, Col, Form, Button, Alert, InputGroup } from "react-bootstrap";
import { LuPlus, LuCheck, LuX } from "react-icons/lu";
import { supabase } from "../supabaseClient";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const Restock = ({ setRender, Id, scannedId }) => {
  // Detect role
  const [staffRole, setStaffRole] = useState(null); // "admin" | "staff"
  const [staffName, setStaffName] = useState("Unknown");

  // Product identity (support both old props)
  const initialProductId = Id || scannedId || "";

  // Common fields
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState(initialProductId);
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [inputExpiryDate, setInputExpiryDate] = useState("");
  const [expiryDates, setExpiryDates] = useState([]);
  const [productImage, setProductImage] = useState(null);
  const [productUnit, setProductUnit] = useState("");

  // Supplier fields
  const [supplierName, setSupplierName] = useState("");
  const [supplierPrice, setSupplierPrice] = useState("");
  const [supplierNumber, setSupplierNumber] = useState("");

  // Supplier dropdown (staff)
  const [supplierList, setSupplierList] = useState([]);
  const [supplierPhoneByName, setSupplierPhoneByName] = useState({});
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");

  // UI
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const toDateString = (date) => new Date(date).toISOString().split("T")[0];

  // --- Fetch current user role & name ---
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: staff, error } = await supabase
            .from("staff")
            .select("staff_name, staff_position")
            .eq("id", user.id)
            .single();

          if (!error && staff) {
            setStaffRole(staff.staff_position); // "admin" | "staff"
            setStaffName(staff.staff_name || "Unknown");
          } else {
            // fallback to local storage (QR login)
            const stored = localStorage.getItem("user");
            if (stored) {
              const parsed = JSON.parse(stored);
              setStaffRole(parsed?.staff_position || "staff");
              setStaffName(parsed?.staff_name || "Unknown");
            } else {
              setStaffRole("staff");
            }
          }
        } else {
          const stored = localStorage.getItem("user");
          if (stored) {
            const parsed = JSON.parse(stored);
            setStaffRole(parsed?.staff_position || "staff");
            setStaffName(parsed?.staff_name || "Unknown");
          } else {
            setStaffRole("staff");
          }
        }
      } catch {
        setStaffRole("staff");
      } finally {
        setLoadingRole(false);
      }
    })();
  }, []);

  // --- Fetch product & suppliers (if needed) ---
  useEffect(() => {
    if (productId) fetchProduct(productId);
  }, [productId]);

  useEffect(() => {
    if (staffRole === "staff") fetchSuppliers();
  }, [staffRole]);

  const fetchProduct = async (id) => {
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("product_ID", id);

    if (error || !products?.length) {
      setError("Product not found.");
      return;
    }

    const p0 = products[0];
    setProductId(p0.product_ID);
    setProductName(p0.product_name);
    setProductUnit(p0.product_unit);
    setSupplierName(p0.supplier_name || "");
    setSupplierPrice(p0.supplier_price ?? "");
    setSupplierNumber(p0.supplier_number || "");

    setExpiryDates(
      products
        .filter((d) => d.product_expiry)
        .map((d) => ({
          product_expiry: toDateString(d.product_expiry),
          product_quantity: d.product_quantity,
        }))
    );

    if (p0.product_img) {
      if (String(p0.product_img).startsWith("http")) {
        setProductImage(p0.product_img);
      } else {
        const { data: urlData } = supabase
          .storage
          .from(BUCKET)
          .getPublicUrl(`products/${p0.product_img}`);
        if (urlData?.publicUrl) setProductImage(urlData.publicUrl);
      }
    } else {
      setProductImage(null);
    }
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("supplier_name, supplier_number");

    if (error || !data) return;

    const namesSet = new Map();
    const freq = {};
    data.forEach((r) => {
      const name = (r.supplier_name || "").trim();
      const num = (r.supplier_number || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!namesSet.has(key)) namesSet.set(key, name);
      if (num) {
        if (!freq[key]) freq[key] = {};
        freq[key][num] = (freq[key][num] || 0) + 1;
      }
    });

    const mapping = {};
    for (const [key, counts] of Object.entries(freq)) {
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (best) mapping[namesSet.get(key)] = best;
    }

    setSupplierPhoneByName(mapping);
    setSupplierList(Array.from(namesSet.values()).sort());
  };

  // --- Submit restock ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const qty = parseInt(quantity, 10);
      if (!qty || qty <= 0) throw new Error("Enter a valid quantity.");

      // If admin, supplier fields are preserved but not editable here; we still save what's already in DB
      const supplier_name = staffRole === "staff" ? supplierName : supplierName;
      const supplier_number = staffRole === "staff" ? supplierNumber : supplierNumber;
      const supplier_price = staffRole === "staff"
        ? parseFloat(supplierPrice) || 0
        : parseFloat(supplierPrice) || 0;

      // Check existing expiry batch
      const { data: existing, error: fetchErr } = await supabase
        .from("products")
        .select("*")
        .eq("product_ID", productId)
        .eq("product_expiry", inputExpiryDate);

      if (fetchErr) throw fetchErr;

      if (existing?.length) {
        const p = existing[0];
        const newQty = parseInt(p.product_quantity, 10) + qty;

        const { error: updateErr } = await supabase
          .from("products")
          .update({
            product_quantity: newQty,
            supplier_name,
            supplier_number,
            supplier_price,
          })
          .eq("product_ID", p.product_ID)
          .eq("product_expiry", inputExpiryDate);

        if (updateErr) throw updateErr;

        // Log only the delta you added (qty)
        await supabase.from("logs").insert([
          {
            product_id: p.product_ID,
            product_name: p.product_name,
            product_quantity: qty,
            product_category: p.product_category,
            product_unit: p.product_unit,
            product_expiry: inputExpiryDate,
            staff: staffName,
            product_action: "Restock",
            product_uuid: p.id,
            supplier_name,
            supplier_number,
            supplier_price,
          },
        ]);

        setSuccess("Quantity updated successfully!");
      } else {
        // New expiry batch
        const { data: base, error: baseErr } = await supabase
          .from("products")
          .select("*")
          .eq("product_ID", productId)
          .limit(1)
          .single();

        if (baseErr) throw baseErr;

        const { error: insertErr } = await supabase.from("products").insert([
          {
            product_ID: base.product_ID,
            product_name: base.product_name,
            product_quantity: qty,
            product_expiry: inputExpiryDate,
            product_brand: base.product_brand,
            product_price: base.product_price,
            product_category: base.product_category,
            product_unit: base.product_unit,
            supplier_name,
            supplier_number,
            supplier_price,
            product_img: base.product_img,
          },
        ]);
        if (insertErr) throw insertErr;

        await supabase.from("logs").insert([
          {
            product_id: base.product_ID,
            product_name: base.product_name,
            product_quantity: qty,
            product_category: base.product_category,
            product_unit: base.product_unit,
            product_expiry: inputExpiryDate,
            staff: staffName,
            product_action: "Restock",
            supplier_name,
            supplier_number,
            supplier_price,
          },
        ]);

        setSuccess("New expiry batch added successfully!");
      }

      setQuantity("");
      setTimeout(() => {
        // same destinations as your current flows
        setRender(productId === scannedId ? "StaffDashboard" : "products");
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewSupplier = () => {
    const name = newSupplierName.trim();
    if (!name) return;
    const updated = Array.from(new Set([...supplierList, name])).sort();
    setSupplierList(updated);
    setSupplierName(name);
    setIsAddingSupplier(false);
    setNewSupplierName("");
  };

  const handleCancelButton = () =>
    setRender(productId === scannedId ? "StaffDashboard" : "products");

  if (loadingRole) {
    return (
      <Container
        fluid
        className="bg-white mx-5 my-4 rounded d-flex justify-content-center align-items-center"
        style={{ width: "135vh", minHeight: "80vh" }}
      >
        <div className="text-muted">Loading…</div>
      </Container>
    );
  }

  return (
    <Container
      fluid
      className="bg-white mx-5 my-4 rounded d-flex flex-column"
      style={{ width: "135vh", minHeight: "80vh" }}
    >
      <div className="d-flex flex-column align-items-center mb-4">
        <span className="mx-0 mt-5 mb-2 d-inline-block h4">
          Restock
        </span>
      </div>

      {error && <Alert variant="danger" className="mx-4">{error}</Alert>}
      {success && <Alert variant="success" className="mx-4">{success}</Alert>}

      <div className="flex-grow-1">
        <Form onSubmit={handleSubmit}>
          <Row>
            {/* LEFT COLUMN */}
            <Col md={6}>
              <div className="ms-5">
                {/* Product ID */}
                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Product ID
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control value={productId} size="sm" disabled />
                  </Col>
                </Form.Group>

                {/* Product Name */}
                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Product Name
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control value={productName} size="sm" disabled />
                  </Col>
                </Form.Group>

                {/* Supplier (editable for staff only) */}
                {staffRole === "staff" ? (
                  <>
                    <Form.Group as={Row} className="mb-3 mt-4">
                      <Form.Label column sm={3} className="text-start">
                        Supplier Name
                      </Form.Label>
                      <Col sm={9}>
                        {!isAddingSupplier ? (
                          <InputGroup size="sm">
                            <Form.Select
                              value={supplierName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSupplierName(val);
                                if (supplierPhoneByName[val]) {
                                  setSupplierNumber(supplierPhoneByName[val]);
                                }
                              }}
                            >
                              <option value="" disabled>
                                Select supplier
                              </option>
                              {supplierList.map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </Form.Select>
                            <Button
                              variant="outline-secondary"
                              onClick={() => setIsAddingSupplier(true)}
                            >
                              <LuPlus />
                            </Button>
                          </InputGroup>
                        ) : (
                          <InputGroup size="sm">
                            <Form.Control
                              value={newSupplierName}
                              onChange={(e) => setNewSupplierName(e.target.value)}
                              placeholder="New supplier"
                            />
                            <Button
                              variant="outline-success"
                              onClick={handleSaveNewSupplier}
                              disabled={!newSupplierName.trim()}
                            >
                              <LuCheck />
                            </Button>
                            <Button
                              variant="outline-secondary"
                              onClick={() => setIsAddingSupplier(false)}
                            >
                              <LuX />
                            </Button>
                          </InputGroup>
                        )}
                      </Col>
                    </Form.Group>

                    <Form.Group as={Row} className="mb-3 mt-4">
                      <Form.Label column sm={3} className="text-start">
                        Supplier Number
                      </Form.Label>
                      <Col sm={9}>
                        <Form.Control
                          value={supplierNumber}
                          onChange={(e) => setSupplierNumber(e.target.value)}
                          size="sm"
                        />
                      </Col>
                    </Form.Group>

                    <Form.Group as={Row} className="mb-3 mt-4">
                      <Form.Label column sm={3} className="text-start">
                        Supplier Price
                      </Form.Label>
                      <Col sm={9}>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.01"
                          value={supplierPrice}
                          onChange={(e) => setSupplierPrice(e.target.value)}
                          size="sm"
                        />
                      </Col>
                    </Form.Group>
                  </>
                ) : (
                  // Admin sees the current supplier info (read-only)
                  <>
                    <Form.Group as={Row} className="mb-3 mt-4">
                      <Form.Label column sm={3} className="text-start">
                        Supplier Name
                      </Form.Label>
                      <Col sm={9}>
                        <Form.Control value={supplierName} size="sm" disabled />
                      </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3 mt-4">
                      <Form.Label column sm={3} className="text-start">
                        Supplier Number
                      </Form.Label>
                      <Col sm={9}>
                        <Form.Control value={supplierNumber} size="sm" disabled />
                      </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3 mt-4">
                      <Form.Label column sm={3} className="text-start">
                        Supplier Price
                      </Form.Label>
                      <Col sm={9}>
                        <Form.Control value={supplierPrice} size="sm" disabled />
                      </Col>
                    </Form.Group>
                  </>
                )}

                {/* Quantity */}
                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Quantity
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      size="sm"
                      required
                    />
                  </Col>
                </Form.Group>

                {/* Expiry Date (new batch) */}
                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Expiry Date
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="date"
                      size="sm"
                      value={inputExpiryDate}
                      onChange={(e) =>
                        setInputExpiryDate(toDateString(e.target.value))
                      }
                    />
                  </Col>
                </Form.Group>

                {/* Existing batches */}
                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Expiry Dates
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Select
                      size="sm"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    >
                      <option value="" disabled>
                        Select expiry date
                      </option>
                      {expiryDates.map((d, i) => (
                        <option key={i} value={d.product_expiry}>
                          {d.product_expiry} (qty: {d.product_quantity})
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                </Form.Group>
              </div>
            </Col>

            {/* RIGHT COLUMN */}
            <Col
              md={6}
              className="d-flex justify-content-center align-items-start mt-4"
            >
              <div
                className="border rounded d-flex flex-column align-items-center justify-content-center"
                style={{
                  width: "250px",
                  height: "250px",
                  backgroundColor: "#f8f9fa",
                  border: "2px dashed #dee2e6",
                }}
              >
                {productImage ? (
                  <img
                    src={productImage}
                    alt={productName}
                    style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }}
                  />
                ) : (
                  <span className="text-muted">No Image Available</span>
                )}
              </div>
            </Col>
          </Row>

          {/* Buttons */}
          <div className="d-flex justify-content-end align-items-end p-3">
            <Button
              variant="secondary"
              type="button"
              size="sm"
              className="me-2"
              onClick={() =>
                setRender("products")
              }
              disabled={loading}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" size="sm" disabled={loading}>
              {loading ? "Restocking..." : "Restock"}
            </Button>
          </div>
        </Form>
      </div>
    </Container>
  );
};

export default Restock;
