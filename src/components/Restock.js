import { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Alert,
  InputGroup,
} from "react-bootstrap";
import { LuPlus, LuCheck, LuX } from "react-icons/lu";
import { supabase } from "../supabaseClient";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const Restock = ({ setRender, Id, scannedId }) => {
  // ---- Form state (mirrors StaffRestock) ----
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState(Id || scannedId || "");
  const [quantity, setQuantity] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [inputExpiryDate, setInputExpiryDate] = useState("");
  const [expiryDates, setExpiryDates] = useState([]);
  const [productImage, setProductImage] = useState(null);

  // Supplier (editable)
  const [supplierName, setSupplierName] = useState("");
  const [supplierPrice, setSupplierPrice] = useState("");
  const [supplierNumber, setSupplierNumber] = useState("");

  // Supplier dropdown controls
  const [supplierList, setSupplierList] = useState([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierError, setSupplierError] = useState("");
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [supplierPhoneByName, setSupplierPhoneByName] = useState({});

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const toDateString = (date) => new Date(date).toISOString().split("T")[0];

  useEffect(() => {
    if (productId) fetchProduct(productId);
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // -------- Suppliers (same logic as StaffRestock) --------
  const fetchSuppliers = async () => {
    try {
      setSupplierError("");
      setSupplierLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("supplier_name, supplier_number");
      if (error) throw error;

      const namesSet = new Map();
      const freq = {};
      (data || []).forEach((r) => {
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
      for (const [k, counts] of Object.entries(freq)) {
        const best = Object.entries(counts).sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
        )[0]?.[0];
        if (best) mapping[namesSet.get(k)] = best;
      }
      setSupplierPhoneByName(mapping);

      const names = Array.from(namesSet.values()).sort((a, b) =>
        a.localeCompare(b)
      );
      setSupplierList(names);
    } catch (err) {
      setSupplierError(err.message || "Failed to load suppliers");
    } finally {
      setSupplierLoading(false);
    }
  };

  const handleSaveNewSupplier = () => {
    const name = newSupplierName.trim();
    if (!name) {
      setSupplierError("Supplier name cannot be empty.");
      return;
    }
    const updated = Array.from(new Set([...supplierList, name])).sort((a, b) =>
      a.localeCompare(b)
    );
    setSupplierList(updated);
    setSupplierName(name);
    setIsAddingSupplier(false);
    setNewSupplierName("");
  };

  const handleCancelAddSupplier = () => {
    setIsAddingSupplier(false);
    setNewSupplierName("");
    setSupplierError("");
  };

  // -------- Product loading (same display fields) --------
  const fetchProduct = async (id) => {
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("product_ID", id);

    if (error) {
      console.error(error);
      setError("Failed to load product.");
      return;
    }
    if (!products?.length) {
      setError("Product not found.");
      return;
    }

    const p0 = products[0];
    setProductId(p0.product_ID);
    setProductName(p0.product_name);
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
        const { data } = supabase
          .storage
          .from(BUCKET)
          .getPublicUrl(`products/${p0.product_img}`);
        if (data?.publicUrl) setProductImage(data.publicUrl);
      }
    } else {
      setProductImage(null);
    }
  };

  // -------- Staff name (same resolver pattern) --------
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

  const handleCancelButton = () =>
    setRender(productId === scannedId ? "StaffDashboard" : "products");

  // -------- Submit (same logic & log payload as StaffRestock) --------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const staffName = await getCurrentStaffName();

      // Look for an exact matching batch for this product + typed expiry
      const { data: batches, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("product_ID", productId)
        .eq("product_expiry", inputExpiryDate || null);

      if (fetchError) throw fetchError;

      if (batches && batches.length > 0) {
        // Update existing batch
        const product = batches[0];
        const newQuantity =
          parseInt(product.product_quantity, 10) + parseInt(quantity, 10);

        const { error: updateError } = await supabase
          .from("products")
          .update({
            product_quantity: newQuantity,
            supplier_name: supplierName,
            supplier_number: supplierNumber,
            supplier_price: parseFloat(supplierPrice) || 0,
          })
          .eq("product_ID", product.product_ID)
          .eq("product_expiry", inputExpiryDate || null);

        if (updateError) throw updateError;

        // Archive-style logs (no supplier_* fields)
        const { error: logError } = await supabase.from("logs").insert([
          {
            product_id: product.product_ID,
            product_name: product.product_name,
            product_quantity: parseInt(quantity, 10), // delta only
            product_category: product.product_category,
            product_unit: product.product_unit,
            product_expiry: inputExpiryDate || null,
            staff: staffName,
            product_action: "Restock",
          },
        ]);
        if (logError) throw logError;

        setSuccess("Quantity updated successfully!");
      } else {
        // Insert new expiry batch
        const { data: base, error: baseError } = await supabase
          .from("products")
          .select("*")
          .eq("product_ID", productId)
          .limit(1)
          .single();
        if (baseError) throw baseError;

        const { error: insertError } = await supabase.from("products").insert([
          {
            product_ID: base.product_ID,
            product_name: base.product_name,
            product_quantity: parseInt(quantity, 10),
            product_expiry: inputExpiryDate || null,
            product_brand: base.product_brand,
            product_price: base.product_price,
            product_category: base.product_category,
            product_unit: base.product_unit,
            supplier_price: parseFloat(supplierPrice) || 0,
            supplier_name: supplierName,
            supplier_number: supplierNumber,
            product_img: base.product_img,
          },
        ]);
        if (insertError) throw insertError;

        const { error: logErr } = await supabase.from("logs").insert([
          {
            product_id: base.product_ID,
            product_name: base.product_name,
            product_quantity: parseInt(quantity, 10),
            product_category: base.product_category,
            product_unit: base.product_unit,
            product_expiry: inputExpiryDate || null,
            staff: staffName,
            product_action: "Restock",
          },
        ]);
        if (logErr) throw logErr;

        setSuccess("New expiry batch added successfully!");
      }

      // Reset a few fields
      setQuantity("");
      setInputExpiryDate("");
      setExpiryDate("");

      setTimeout(() => {
        setRender(productId === scannedId ? "StaffDashboard" : "products");
      }, 800);
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // -------- UI (mirrors StaffRestock layout/controls) --------
  return (
    <Container
      fluid
      className="bg-white mx-5 my-4 rounded d-flex flex-column"
      style={{ width: "135vh", minHeight: "80vh" }}
    >
      <div className="d-flex flex-column align-items-center mb-4">
        <span className="mx-0 mt-5 mb-2 d-inline-block h4">Restock</span>
      </div>

      {error && (
        <div className="alert alert-danger mx-4" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success mx-4" role="alert">
          {success}
        </div>
      )}

      <div className="flex-grow-1">
        <Form onSubmit={handleSubmit}>
          <Row>
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

                {/* Supplier Name (dropdown + add new) */}
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
                            const suggested = supplierPhoneByName[val];
                            if (suggested) setSupplierNumber(suggested);
                          }}
                          disabled={supplierLoading}
                        >
                          <option value="" disabled>
                            {supplierLoading
                              ? "Loading suppliers..."
                              : "Select supplier"}
                          </option>
                          {supplierList.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Form.Select>
                        <Button
                          variant="outline-secondary"
                          title="Add a new supplier"
                          onClick={() => {
                            setIsAddingSupplier(true);
                            setTimeout(() => {
                              const el =
                                document.getElementById("newSupplierInput");
                              el && el.focus();
                            }, 0);
                          }}
                        >
                          <LuPlus />
                        </Button>
                      </InputGroup>
                    ) : (
                      <InputGroup size="sm">
                        <Form.Control
                          id="newSupplierInput"
                          type="text"
                          placeholder="Type new supplier name"
                          value={newSupplierName}
                          onChange={(e) => setNewSupplierName(e.target.value)}
                          disabled={supplierLoading}
                        />
                        <Button
                          variant="outline-success"
                          title="Save supplier"
                          onClick={handleSaveNewSupplier}
                          disabled={supplierLoading || !newSupplierName.trim()}
                        >
                          <LuCheck />
                        </Button>
                        <Button
                          variant="outline-secondary"
                          title="Cancel"
                          onClick={handleCancelAddSupplier}
                          disabled={supplierLoading}
                        >
                          <LuX />
                        </Button>
                      </InputGroup>
                    )}
                    {supplierError && (
                      <div className="mt-2">
                        <Alert variant="warning" className="py-1 px-2 mb-0">
                          {supplierError}
                        </Alert>
                      </div>
                    )}
                  </Col>
                </Form.Group>

                {/* Supplier Number */}
                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Supplier Number
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="text"
                      placeholder="Enter supplier contact number"
                      size="sm"
                      value={supplierNumber}
                      onChange={(e) => setSupplierNumber(e.target.value)}
                    />
                  </Col>
                </Form.Group>

                {/* Supplier Price */}
                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Supplier Price
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter supplier price"
                      size="sm"
                      value={supplierPrice}
                      onChange={(e) => setSupplierPrice(e.target.value)}
                    />
                  </Col>
                </Form.Group>

                {/* Quantity */}
                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Quantity
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="number"
                      min="0"
                      placeholder="Enter quantity"
                      size="sm"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </Col>
                </Form.Group>

                {/* Expiry Date (typed) */}
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

                {/* Existing expiry list + current qty */}
                <div className="mt-5">
                  <h5>Current Quantity</h5>
                </div>
                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Expiry Dates
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Select
                      size="sm"
                      value={expiryDate || ""}
                      onChange={(e) => {
                        setExpiryDate(e.target.value);
                        const selected = expiryDates.find(
                          (d) =>
                            new Date(d.product_expiry)
                              .toISOString()
                              .split("T")[0] === e.target.value
                        );
                        setCurrentQuantity(
                          selected ? selected.product_quantity : null
                        );
                      }}
                    >
                      {expiryDates && expiryDates.length > 0 ? (
                        expiryDates.map((d, idx) => {
                          const formatted = new Date(d.product_expiry)
                            .toISOString()
                            .split("T")[0];
                          return (
                            <option key={idx} value={formatted}>
                              {formatted} (qty: {d.product_quantity})
                            </option>
                          );
                        })
                      ) : (
                        <option disabled>No expiry dates</option>
                      )}
                    </Form.Select>
                  </Col>
                </Form.Group>
              </div>
            </Col>

            {/* Image */}
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
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      borderRadius: "8px",
                    }}
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
              onClick={handleCancelButton}
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
