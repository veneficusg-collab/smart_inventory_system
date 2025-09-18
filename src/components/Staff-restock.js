import { Container } from "react-bootstrap";
import { Row, Form, Col, Button, InputGroup } from "react-bootstrap";
import { useEffect, useState } from "react";
import { LuScanBarcode } from "react-icons/lu";
import { supabase } from "../supabaseClient";
import BarcodeModal from "./barcode-modal";
import QrScanner from "./qr-scanner";

const StaffRestock = ({ setRender, scannedId }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [qrModalShow, setQrModalShow] = useState(false);

  // Form state
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState(""); // ← fix
  const [quantity, setQuantity] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState("");
  const [staffName, setStaffName] = useState(""); // ← fix
  const [expiryDate, setExpiryDate] = useState(""); // safer than null
  const [inputExpiryDate, setInputExpiryDate] = useState("");
  const [expiryDates, setExpiryDates] = useState([]);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchProduct(scannedId);
  }, []);

  const fetchProduct = async (scannedId) => {
    let { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("product_ID", scannedId);

    console.log(products);

    if (products && products.length > 0) {
      setProductId(products[0].product_ID);
      setProductName(products[0].product_name);

      // default: pick the first expiry
      setExpiryDates(
        products
          .filter((d) => d.product_expiry) // only valid dates
          .map((d) => ({
            product_expiry: toDateString(d.product_expiry),
            product_quantity: d.product_quantity,
          }))
      );
    } else {
      console.log("ID not Found");
    }
  };

  const handleScannedQr = async (code) => {
    let { data: staff, error } = await supabase
      .from("staff")
      .select("staff_name")
      .eq("staff_barcode", code)
      .single();
    setStaffName(staff.staff_name);
    console.log(staff);
  };

  const handleCancelButton = () => {
    setRender("StaffDashboard");
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  setSuccess("");

  try {
    // 1. Check if product with same expiry exists
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .eq("product_ID", productId)
      .eq("product_expiry", inputExpiryDate);

    if (fetchError) throw fetchError;

    if (products && products.length > 0) {
      // ✅ Expiry already exists → update quantity
      const product = products[0];
      const newQuantity =
        parseInt(product.product_quantity, 10) + parseInt(quantity, 10);

      const { data, error: updateError } = await supabase
        .from("products")
        .update({ product_quantity: newQuantity })
        .eq("product_ID", product.product_ID)
        .eq("product_expiry", inputExpiryDate)
        .select();

      if (updateError) throw updateError;


        const { data:logs, error } = await supabase
        .from('logs')
        .insert([
            { 
                product_id: product.product_ID,
                product_name: product.product_name,
                product_quantity: newQuantity,
                product_category: product.product_category,
                product_unit: product.product_unit,
                product_expiry: inputExpiryDate,
                staff: staffName,
                product_action: "Restock",
                product_uuid:product.id
             },
        ])
        .select();



      setSuccess("Quantity updated successfully!");
      console.log("Updated:", data);
       setTimeout(()=>{
        setRender("StaffDashboard");
      },1000);
    } else {
      // 🚀 Expiry not found → fetch base product details
      const { data: baseProduct, error: baseError } = await supabase
        .from("products")
        .select("*")
        .eq("product_ID", productId)
        .limit(1)
        .single();

      if (baseError) throw baseError;

      const { data, error: insertError } = await supabase
        .from("products")
        .insert([
          {
            product_ID: baseProduct.product_ID,
            product_name: baseProduct.product_name,
            product_quantity: parseInt(quantity, 10),
            product_expiry: inputExpiryDate,
            product_category: baseProduct.product_category,
            product_price: baseProduct.product_price,
            product_unit: baseProduct.product_unit,
            supplier_name: baseProduct.supplier_name,
            supplier_number: baseProduct.supplier_number,
            branch: baseProduct.branch,
          },
        ])
        .select();

      if (insertError) throw insertError;

       const { data:logs, error } = await supabase
        .from('logs')
        .insert([
            { 
                product_id: baseProduct.product_ID,
                product_name: baseProduct.product_name,
                product_quantity: parseInt(quantity, 10),
                product_category: baseProduct.product_category,
                product_unit: baseProduct.product_unit,
                product_expiry: inputExpiryDate,
                staff: staffName,
                product_action: "Restock",
                product_uuid:baseProduct.id
             },
        ])
        .select();

      setSuccess("New expiry batch added successfully!");
      console.log("Inserted:", data);
      setTimeout(()=>{
        setRender("StaffDashboard");
      },1000);
    }
  } catch (err) {
    console.error("Error in handleSubmit:", err.message);
    setError("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};



  const toDateString = (date) => {
    return new Date(date).toISOString().split("T")[0]; // "yyyy-mm-dd"
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

      <div className="d-flex flex-column align-items-center mb-4">
        <span className="mx-0 mt-5 mb-2 d-inline-block h4">Restock</span>
      </div>
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
                      onChange={(e) => setProductName(e.target.value)}
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
                  controlId="formExpiryDate"
                >
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
                  </Col>
                </Form.Group>
                {/* Expiry date select */}

                <div className="mt-5">
                  <h5>Current Quantity</h5>
                </div>
                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formExpiryDate"
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

                        // ✅ also update currentQuantity for selected expiry batch
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

            <Col md={5}>
              <div className="ms-3 mt-4"></div>
            </Col>
          </Row>

          {/* Buttons fixed at bottom-right */}
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
