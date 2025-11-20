// StaffUnstock.js
import { Container } from "react-bootstrap";
import { Row, Form, Col, Button, InputGroup, Alert } from "react-bootstrap";
import { useEffect, useState } from "react";
import { LuScanBarcode } from "react-icons/lu";
import { supabase } from "../supabaseClient";
import QrScanner from "./qr-scanner";
import BarcodeModal from "./barcode-modal";

const StaffUnstock = ({ setRender, scannedId }) => {
  const [qrModalShow, setQrModalShow] = useState(false);
  const [barcodeModalShow, setBarcodeModalShow] = useState(false); // NEW: barcode modal

  // Form state
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState(scannedId || "");
  const [manualProductId, setManualProductId] = useState(""); // NEW: for manual input
  const [quantity, setQuantity] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState("");
  const [staffName, setStaffName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [inputExpiryDate, setInputExpiryDate] = useState("");
  const [expiryDates, setExpiryDates] = useState([]);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (productId) {
      fetchProduct(productId);
    }
  }, [productId]);

  // NEW: Handle manual product ID submission
  const handleManualProductIdSubmit = () => {
    if (manualProductId.trim()) {
      setProductId(manualProductId.trim());
      setManualProductId(""); // Clear the manual input field
    }
  };

  // NEW: Handle barcode scan
  const handleBarcodeScan = (scannedId) => {
    setProductId(scannedId);
    setBarcodeModalShow(false);
  };

  const fetchProduct = async (productIdToFetch) => {
    try {
      setError("");
      let { data: products, error } = await supabase
        .from("products")
        .select("*")
        .eq("product_ID", productIdToFetch);

      if (error) throw error;

      if (products && products.length > 0) {
        setProductId(products[0].product_ID);
        setProductName(products[0].product_name);

        const formattedDates = products
          .filter((d) => d.product_expiry)
          .map((d) => ({
            product_expiry: toDateString(d.product_expiry), // "YYYY-MM-DD"
            product_quantity: d.product_quantity,
          }));

        setExpiryDates(formattedDates);

        if (formattedDates.length > 0) {
          // Always set the first expiry date
          setExpiryDate(formattedDates[0].product_expiry);
          setCurrentQuantity(formattedDates[0].product_quantity);
        }
      } else {
        setError("Product ID not found.");
      }
    } catch (err) {
      setError("Failed to load product.");
      console.error("Error fetching product:", err);
    }
  };

  const handleScannedQr = async (code) => {
    try {
      let { data: staff, error } = await supabase
        .from("staff")
        .select("staff_name")
        .eq("staff_barcode", code)
        .single();
      
      if (error) throw error;
      
      setStaffName(staff.staff_name);
      console.log(staff);
    } catch (err) {
      setError("Staff not found. Please scan a valid staff QR code.");
      console.error("Error fetching staff:", err);
    }
  };

  const handleCancelButton = () => {
    setRender("StaffDashboard");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // NEW: Check if product is loaded
    if (!productId) {
      setError("Please enter or scan a Product ID first.");
      return;
    }

    if (!expiryDate) {
      setError("Please select an expiry date before unstocking.");
      return;
    }

    if (!staffName) {
      setError("Please scan staff QR code before unstocking.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // 1. Check if product with same expiry exists
      const { data: products, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("product_ID", productId)
        .eq("product_expiry", expiryDate);

      if (fetchError) throw fetchError;

      if (products && products.length > 0) {
        // ✅ Expiry already exists → subtract quantity
        const product = products[0];
        const newQuantity =
          parseInt(product.product_quantity, 10) - parseInt(quantity, 10);

        if (newQuantity < 0) {
          throw new Error("Cannot unstock more than available quantity");
        }

        const { data, error: updateError } = await supabase
          .from("products")
          .update({ product_quantity: newQuantity })
          .eq("product_ID", product.product_ID)
          .eq("product_expiry", expiryDate)
          .select();

        if (updateError) throw updateError;

        const { data: logs, error: logError } = await supabase
          .from('logs')
          .insert([
            { 
              product_id: product.product_ID,
              product_name: product.product_name,
              product_quantity: parseInt(quantity, 10),
              product_category: product.product_category,
              product_unit: product.product_unit,
              product_expiry: expiryDate,
              staff: staffName,
              product_action: "Unstock",
            },
          ])
          .select();
        
        if (logError) throw logError;
        
        setSuccess("Quantity reduced successfully!");
        setQuantity(""); // Clear quantity field
        
        setTimeout(() => {
          setRender("StaffDashboard");
        }, 1000);
      } else {
        // 🚀 Expiry not found
        throw new Error("Product expiry not found. Cannot unstock.");
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err.message);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toDateString = (date) => {
    return new Date(date).toISOString().split("T")[0];
  };

  return (
    <Container
      fluid
      className="bg-white mx-5 my-4 rounded d-flex flex-column"
      style={{ width: "135vh", minHeight: "80vh" }}
    >
      <QrScanner
        show={qrModalShow}
        onHide={() => setQrModalShow(false)}
        onScan={(code) => handleScannedQr(code)}
      />

      <BarcodeModal
        show={barcodeModalShow}
        setBarcodeModalShow={setBarcodeModalShow}
        setProductId={handleBarcodeScan}
      />

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

      {/* NEW: Manual Product ID Input Section */}
      {!productId && (
        <div className="mx-4 mb-4 p-3 border rounded bg-light">
          <h6 className="mb-3">Enter Product ID</h6>
          <InputGroup size="sm">
            <Form.Control
              type="text"
              placeholder="Enter Product ID manually"
              value={manualProductId}
              onChange={(e) => setManualProductId(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleManualProductIdSubmit();
                }
              }}
            />
            <Button
              variant="outline-secondary"
              onClick={() => setBarcodeModalShow(true)}
            >
              <LuScanBarcode />
            </Button>
            <Button
              variant="primary"
              onClick={handleManualProductIdSubmit}
              disabled={!manualProductId.trim()}
            >
              Load Product
            </Button>
          </InputGroup>
          <Form.Text className="text-muted">
            Enter Product ID manually or scan barcode to load product details.
          </Form.Text>
        </div>
      )}

      <div className="flex-grow-1">
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <div className="ms-5">
                <Form.Group as={Row} className="mb-3 mt-4" controlId="formUnit">
                  <Form.Label column sm={3} className="text-start">
                    Product ID
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="text"
                      placeholder="Product ID"
                      size="sm"
                      value={productId}
                      required
                      disabled
                    />
                  </Col>
                </Form.Group>

                {/* Only show the rest of the form if a product is loaded */}
                {productId && (
                  <>
                    <Form.Group
                      as={Row}
                      className="mb-3 mt-4"
                      controlId="formProductName"
                    >
                      <Form.Label column sm={3} className="text-start">
                        Product Name
                      </Form.Label>
                      <Col sm={9}>
                        <Form.Control
                          type="text"
                          placeholder="Enter product name"
                          size="sm"
                          value={productName}
                          required
                          disabled
                        />
                      </Col>
                    </Form.Group>

                    <Form.Group
                      as={Row}
                      className="mb-3 mt-4"
                      controlId="formQuantity"
                    >
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

                    <Form.Group
                      as={Row}
                      className="mb-3 mt-4"
                      controlId="formExpiryDateSelect"
                    >
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
                              (d) => d.product_expiry === e.target.value
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
                                <option key={idx} value={d.product_expiry}>
                                  {d.product_expiry} (qty: {d.product_quantity})
                                </option>
                              );
                            })
                          ) : (
                            <option value="" disabled>No expiry dates</option>
                          )}
                        </Form.Select>
                        {currentQuantity && (
                          <Form.Text className="text-muted">
                            Current quantity: {currentQuantity}
                          </Form.Text>
                        )}
                      </Col>
                    </Form.Group>

                    <Form.Group
                      as={Row}
                      className="mb-3 mt-4"
                      controlId="formProductId"
                    >
                      <Form.Label column sm={3} className="text-start">
                        Staff
                      </Form.Label>
                      <Col sm={9}>
                        <InputGroup size="sm">
                          <Form.Control
                            type="text"
                            placeholder="Staff"
                            value={staffName}
                            required
                            disabled
                          />

                          <Button
                            variant="outline-secondary"
                            onClick={() => setQrModalShow(true)}
                          >
                            <LuScanBarcode />
                          </Button>
                        </InputGroup>
                        <Form.Text className="text-muted">
                          Scan staff QR code to authorize unstock
                        </Form.Text>
                      </Col>
                    </Form.Group>
                  </>
                )}
              </div>
            </Col>

            <Col md={5}>
              <div className="ms-3 mt-4">
                {/* Optional: You can add product image display here if needed */}
              </div>
            </Col>
          </Row>

          {/* Buttons - only show if product is loaded */}
          {productId && (
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
              <Button variant="danger" type="submit" size="sm" disabled={loading || !quantity || !staffName}>
                {loading ? "Unstocking..." : "Unstock"}
              </Button>
            </div>
          )}
        </Form>
      </div>
    </Container>
  );
};

export default StaffUnstock;