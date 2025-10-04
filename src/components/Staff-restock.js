import { Container } from "react-bootstrap";
import { Row, Form, Col, Button } from "react-bootstrap";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const StaffRestock = ({ setRender, scannedId }) => {
  // Form state
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [inputExpiryDate, setInputExpiryDate] = useState("");
  const [expiryDates, setExpiryDates] = useState([]);

  // Supplier fields (editable)
  const [supplierName, setSupplierName] = useState("");
  const [supplierPrice, setSupplierPrice] = useState("");
  const [supplierNumber, setSupplierNumber] = useState(""); // ← NEW

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchProduct(scannedId);
  }, []);

  const toDateString = (date) => new Date(date).toISOString().split("T")[0];

  const fetchProduct = async (scannedId) => {
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("product_ID", scannedId);

    if (error) {
      console.error(error);
      setError("Failed to load product.");
      return;
    }

    if (products && products.length > 0) {
      const p0 = products[0];
      setProductId(p0.product_ID);
      setProductName(p0.product_name);
      setSupplierName(p0.supplier_name || "");
      setSupplierPrice(p0.supplier_price ?? "");
      setSupplierNumber(p0.supplier_number || ""); // populate

      setExpiryDates(
        products
          .filter((d) => d.product_expiry)
          .map((d) => ({
            product_expiry: toDateString(d.product_expiry),
            product_quantity: d.product_quantity,
          }))
      );
    } else {
      setError("ID not found.");
    }
  };

  const getCurrentStaffName = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: staff, error } = await supabase
        .from("staff")
        .select("staff_name")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return staff?.staff_name || "Unknown";
    }

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return parsed?.staff_name || "Unknown";
      } catch {
        return "Unknown";
      }
    }
    return "Unknown";
  };

  const handleCancelButton = () => setRender("StaffDashboard");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const staffName = await getCurrentStaffName();

      const { data: products, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("product_ID", productId)
        .eq("product_expiry", inputExpiryDate);

      if (fetchError) throw fetchError;

      if (products && products.length > 0) {
        // Update existing batch
        const product = products[0];
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
          .eq("product_expiry", inputExpiryDate);

        if (updateError) throw updateError;

        await supabase.from("logs").insert([
          {
            product_id: product.product_ID,
            product_name: product.product_name,
            product_quantity: newQuantity,
            product_category: product.product_category,
            product_unit: product.product_unit,
            product_expiry: inputExpiryDate,
            staff: staffName,
            product_action: "Restock",
            product_uuid: product.id,
            supplier_name: supplierName,
            supplier_number: supplierNumber,
            supplier_price: parseFloat(supplierPrice),
          },
        ]);

        setSuccess("Quantity updated successfully!");
        setTimeout(() => setRender("StaffDashboard"), 1000);
      } else {
        // Insert a new expiry batch
        const { data: baseProduct, error: baseError } = await supabase
          .from("products")
          .select("*")
          .eq("product_ID", productId)
          .limit(1)
          .single();
        if (baseError) throw baseError;

        const { error: insertError } = await supabase
          .from("products")
          .insert([
            {
              product_ID: baseProduct.product_ID,
              product_name: baseProduct.product_name,
              product_quantity: parseInt(quantity, 10),
              product_expiry: inputExpiryDate,
              product_price: baseProduct.product_price,
              product_category: baseProduct.product_category,
              product_unit: baseProduct.product_unit,
              supplier_price: parseFloat(supplierPrice) || 0,
              supplier_name: supplierName,
              supplier_number: supplierNumber,
              branch: baseProduct.branch,
            },
          ]);
        if (insertError) throw insertError;

        await supabase.from("logs").insert([
          {
            product_id: baseProduct.product_ID,
            product_name: baseProduct.product_name,
            product_quantity: parseInt(quantity, 10),
            product_category: baseProduct.product_category,
            product_unit: baseProduct.product_unit,
            product_expiry: inputExpiryDate,
            staff: staffName,
            product_action: "Restock",
            product_uuid: baseProduct.id,
            supplier_name: supplierName,
            supplier_number: supplierNumber,
            supplier_price: parseFloat(supplierPrice) || 0,
          },
        ]);

        setSuccess("New expiry batch added successfully!");
        setTimeout(() => setRender("StaffDashboard"), 1000);
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err.message);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

                {/* Supplier Name */}
                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Supplier Name
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="text"
                      placeholder="Enter supplier name"
                      size="sm"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                    />
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

                {/* Expiry Date */}
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

                {/* Expiry Dates dropdown */}
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
            <Button
              variant="primary"
              type="submit"
              size="sm"
              disabled={loading}
            >
              {loading ? "Restocking..." : "Restock"}
            </Button>
          </div>
        </Form>
      </div>
    </Container>
  );
};

export default StaffRestock;
