import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Col, Container, Row } from "react-bootstrap";
import { Form, Button, Alert } from "react-bootstrap";
import { BrowserMultiFormatReader } from "@zxing/browser";
import BarcodeModal from "./barcode-modal";

const Restock = ({ setRender, Id }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCamera, setShowCamera] = useState(false);
  const scannedRef = useRef(false);

  const [barcodeModalShow, setBarcodeModalShow] = useState(false);

  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState("");
  const [category, setCategory] = useState("");
  const [buyingPrice, setBuyingPrice] = useState(null);
  const [currentQuantity, setCurrentQuantity] = useState("");
  const [quantity, setQuantity] = useState(null);
  const [unit, setUnit] = useState("");
  const [productUnit, setProductUnit] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierNumber, setSupplierNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [result, onResult] = useState("");
  const [imgUrl, setImgURL] = useState("");
  const [expiryDates, setExpiryDates] = useState([]); // now holds objects

  const videoRef = useRef(null);
  const scannerControlsRef = useRef(null);

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(
        "product_ID, product_name, product_quantity, product_unit, product_expiry"
      )
      .eq("product_ID", Id); // fetch ALL rows with same product ID

    if (error) {
      console.error("Error fetching product:", error);
      setError("Failed to load product");
      return;
    }

    if (data && data.length > 0) {
      // use first row for product info
      const product = data[0];
      setProductId(product.product_ID);
      setProductName(product.product_name);
      setProductUnit(product.product_unit);

      // expiryDates should be an array of { product_expiry, product_quantity }
      setExpiryDates(
        data
          .filter((d) => d.product_expiry) // only valid dates
          .map((d) => ({
            product_expiry: d.product_expiry,
            product_quantity: d.product_quantity,
          }))
      );
    }
  };

  const handleRestockButton = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("staff_name")
        .eq("id", user.id);

      if (staffError) throw staffError;

      const staffName = staffData?.[0]?.staff_name || "Unknown";

      // Convert to numbers
      const qtyToAdd = parseInt(quantity);
      const currQty = parseInt(currentQuantity) || 0;

      if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
        throw new Error("Enter a valid quantity to restock.");
      }

      const newQuantity = currQty + qtyToAdd;

      const { data, error } = await supabase
        .from("products")
        .update({ product_quantity: newQuantity })
        .eq("product_ID", productId)
        .eq("product_expiry", expiryDate)
        .select();

      if (error) throw error;

      const updatedProduct = data[0]; // 👈 first updated row

      const { data: logs, error: errorLogs } = await supabase
        .from("logs")
        .insert([
          {
            product_id: updatedProduct.product_ID,
            product_name: updatedProduct.product_name,
            product_quantity: qtyToAdd,
            product_category: updatedProduct.product_category,
            product_unit: updatedProduct.product_unit,
            product_expiry: updatedProduct.product_expiry,
            product_action: "Restock",
            staff: staffName,
            product_uuid:updatedProduct.id
          },
        ])
        .select();

      if (errorLogs) throw errorLogs;

      setSuccess("Product restocked successfully!");
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

  const handleCancelButton = () => {
    if (scannerControlsRef.current) {
      scannerControlsRef.current.stop(); // ✅ stop scanner immediately
    }
    setRender("product");
  };

  // useEffect(() => {
  //   scannedRef.current = false; // reset whenever camera is shown
  //   const codeReader = new BrowserMultiFormatReader();

  //   codeReader
  //     .decodeFromVideoDevice(null, videoRef.current, (result, error) => {
  //       if (result && !scannedRef.current) {
  //         scannedRef.current = true; // ✅ only once
  //         const code = result.getText();
  //         console.log("Scanned once:", code);

  //         setProductId(code);
  //         handleScannedProduct(code);
  //         setShowCamera(false); // hide camera

  //         if (scannerControlsRef.current) {
  //           scannerControlsRef.current.stop();
  //           scannerControlsRef.current = null;
  //         }
  //       }

  //       if (error && !(error.name === "NotFoundException")) {
  //         console.error(error);
  //       }
  //     })
  //     .then((controls) => {
  //       scannerControlsRef.current = controls;
  //     });

  //   return () => {
  //     if (scannerControlsRef.current) {
  //       scannerControlsRef.current.stop();
  //       scannerControlsRef.current = null;
  //     }
  //   };
  // }, [showCamera]);

  // const handleScannedProduct = async (productId) => {
  //   let { data: products, error } = await supabase
  //     .from("products")
  //     .select("*")
  //     .eq("product_ID", productId);

  //   if (error) {
  //     console.error(error);
  //     return;
  //   }

  //   let { data: expiryData, error: expiryError } = await supabase
  //     .from("products")
  //     .select("product_expiry, product_quantity")
  //     .eq("product_ID", productId);

  //   if (expiryError) {
  //     console.error(expiryError);
  //     return;
  //   }

  //   if (expiryData) {
  //     // ✅ only keep valid rows
  //     setExpiryDates(
  //       expiryData.filter(
  //         (e) => e.product_expiry && !isNaN(new Date(e.product_expiry))
  //       )
  //     );
  //   }

  //   if (products && products.length > 0) {
  //     setProductName(products[0].product_name);
  //     setCategory(products[0].product_category);
  //     setBuyingPrice(products[0].product_price);
  //     setUnit(products[0].product_unit);
  //     setSupplierName(products[0].supplier_name);
  //     setSupplierNumber(products[0].supplier_number);
  //     setImgURL(products[0].product_img);
  //   } else {
  //     setProductName("");
  //   }
  // };

  const resetForm = () => {
    window.location.reload();
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

      {/* Success/Error Messages */}
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

      {/* Form content - takes available space */}
      <div className="flex-grow-1">
        <Form onSubmit={handleRestockButton} className="me-5">
          <Row>
            <Col>
              <div className="ms-5">
                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formProductId"
                >
                  <Form.Label column sm={3} className="text-start">
                    Product ID
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="text"
                      placeholder="Enter product ID"
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
                      placeholder="Enter Restock Quantity"
                      size="sm"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </Col>
                </Form.Group>

                <Form.Group as={Row} className="mb-3 mt-4" controlId="formUnit">
                  <Form.Label column sm={3} className="text-start">
                    Unit
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="text"
                      placeholder="Enter product unit (e.g., kg, pcs, liters)"
                      size="sm"
                      value={productUnit}
                      disabled
                    />
                  </Col>
                </Form.Group>

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
                      required
                    >
                      <option value="" disabled>
                        Select expiry date
                      </option>
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

          {/* Buttons fixed at bottom-right */}
          <div className="d-flex justify-content-end align-items-end p-3">
            <Button
              variant="outline-secondary"
              type="button"
              size="sm"
              className="me-2"
              onClick={resetForm}
              disabled={loading}
            >
              Reset
            </Button>
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

export default Restock;
