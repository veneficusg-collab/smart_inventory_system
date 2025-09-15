import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Col, Container, Row } from "react-bootstrap";
import { Form, Button, Alert } from "react-bootstrap";

const Unstock = ({ setRender, Id }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState("");
  const [category, setCategory] = useState("");
  const [buyingPrice, setBuyingPrice] = useState(null);
  const [currentQuantity, setCurrentQuantity] = useState("");
  const [quantity, setQuantity] = useState(null);
  const [productUnit, setProductUnit] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierNumber, setSupplierNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryDates, setExpiryDates] = useState([]); // multiple expiry batches

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(
        "product_ID, product_name, product_quantity, product_unit, product_expiry"
      )
      .eq("product_ID", Id);

    if (error) {
      console.error("Error fetching product:", error);
      setError("Failed to load product");
      return;
    }

    if (data && data.length > 0) {
      const product = data[0];
      setProductId(product.product_ID);
      setProductName(product.product_name);
      setProductUnit(product.product_unit);

      setExpiryDates(
        data
          .filter((d) => d.product_expiry)
          .map((d) => ({
            product_expiry: d.product_expiry,
            product_quantity: d.product_quantity,
          }))
      );
    }
  };

  const handleUnstockButton = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // ✅ Get logged-in staff
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("staff_name")
        .eq("id", user.id);

      if (staffError) throw staffError;

      const staffName = staffData?.[0]?.staff_name || "Unknown";

      // ✅ Parse values
      const qtyToRemove = parseInt(quantity);
      const currQty = parseInt(currentQuantity) || 0;

      if (isNaN(qtyToRemove) || qtyToRemove <= 0) {
        throw new Error("Enter a valid quantity to unstock.");
      }

      const newQuantity = currQty - qtyToRemove;

      if (newQuantity < 0) {
        throw new Error(
          "Unstock quantity cannot be greater than current quantity."
        );
      }

      // ✅ Update product quantity
      const { data, error } = await supabase
        .from("products")
        .update({ product_quantity: newQuantity })
        .eq("product_ID", productId)
        .eq("product_expiry", expiryDate)
        .select();

      if (error) throw error;

      const updatedProduct = data[0]; // get first updated row

      // ✅ Insert into logs
      const { error: errorLogs } = await supabase.from("logs").insert([
        {
          product_id: updatedProduct.product_ID,
          product_name: updatedProduct.product_name,
          product_quantity: qtyToRemove, // qty removed
          product_category: updatedProduct.product_category,
          product_unit: updatedProduct.product_unit,
          product_expiry: updatedProduct.product_expiry,
          product_action: "Unstock", // 👈 key difference
          staff: staffName,
          product_uuid: updatedProduct.id, // for traceability
        },
      ]);

      if (errorLogs) throw errorLogs;

      setSuccess("Product unstocked successfully!");
      setCurrentQuantity(newQuantity);
      setQuantity(null);

      setTimeout(() => {
        setRender("products");
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => window.location.reload();

  const handleCancelButton = () => setRender("product");

  return (
    <Container
      fluid
      className="bg-white mx-5 my-4 rounded d-flex flex-column"
      style={{ width: "135vh", minHeight: "80vh" }}
    >
      <div className="d-flex flex-column align-items-center mb-4">
        <span className="mx-0 mt-5 mb-2 d-inline-block h4">Unstock</span>
      </div>

      {error && (
        <Alert variant="danger" className="mx-4">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mx-4">
          {success}
        </Alert>
      )}

      <div className="flex-grow-1">
        <Form onSubmit={handleUnstockButton} className="me-5">
          <Row>
            <Col>
              <div className="ms-5">
                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Product ID
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control type="text" value={productId} disabled />
                  </Col>
                </Form.Group>

                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Product Name
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control type="text" value={productName} disabled />
                  </Col>
                </Form.Group>

                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Quantity
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="number"
                      min="0"
                      placeholder="Enter Unstock Quantity"
                      value={quantity || ""}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </Col>
                </Form.Group>

                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Unit
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control type="text" value={productUnit} disabled />
                  </Col>
                </Form.Group>

                <Form.Group as={Row} className="mb-3 mt-4">
                  <Form.Label column sm={3} className="text-start">
                    Expiry Dates
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Select
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
                          selected ? selected.product_quantity : 0
                        );
                      }}
                      required
                    >
                      <option value="" disabled>
                        Select expiry date
                      </option>
                      {expiryDates.map((d, idx) => {
                        const formatted = new Date(d.product_expiry)
                          .toISOString()
                          .split("T")[0];
                        return (
                          <option key={idx} value={formatted}>
                            {formatted} (qty: {d.product_quantity})
                          </option>
                        );
                      })}
                    </Form.Select>
                  </Col>
                </Form.Group>
              </div>
            </Col>
          </Row>

          <div className="d-flex justify-content-end align-items-end p-3">
            <Button
              variant="outline-secondary"
              size="sm"
              className="me-2"
              onClick={resetForm}
              disabled={loading}
            >
              Reset
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="me-2"
              onClick={handleCancelButton}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={loading}
            >
              {loading ? "Unstocking..." : "Unstock"}
            </Button>
          </div>
        </Form>
      </div>
    </Container>
  );
};

export default Unstock;
