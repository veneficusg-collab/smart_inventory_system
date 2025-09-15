import { Col, Container, Row } from "react-bootstrap";
import { Form, Button, Alert } from "react-bootstrap";
import { InputGroup } from "react-bootstrap";
import Modal from "react-bootstrap/Modal";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import BarcodeModal from "./barcode-modal";
import { LuScanBarcode } from "react-icons/lu";

const AddProduct = ({ setRender }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [barcodeModalShow, setBarcodeModalShow] = useState(false);

  // Form state
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState(""); // ← fix
  const [category, setCategory] = useState(""); // ← fix
  const [buyingPrice, setBuyingPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(""); // ← fix
  const [supplierName, setSupplierName] = useState(""); // ← fix
  const [supplierNumber, setSupplierNumber] = useState(""); // ← fix
  const [expiryDate, setExpiryDate] = useState(""); // safer than null

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    console.log(productName);
  }, [productName]);

  // Handles drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handles file drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        handleImageFile(file);
      }
    }
  };

  // Processes the image file
  const handleImageFile = (file) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handles file selection from the input
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  // Removes the selected image
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleCancelButton = () => {
    setRender("product");
  };

  // Upload image to Supabase Storage
  const uploadImage = async (file) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from("Smart-Inventory-System-(Pet Matters)") // Make sure this bucket exists in your Supabase Storage
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage
        .from("Smart-Inventory-System-(Pet Matters)")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleAddProductButton = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validation
      if (!productName.trim()) throw new Error("Product name is required");
      if (!productId.trim()) throw new Error("Product ID is required");
      if (!buyingPrice || buyingPrice <= 0)
        throw new Error("Valid buying price is required");
      if (!quantity || quantity <= 0)
        throw new Error("Valid quantity is required");

      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      // Prepare product data
      const productData = {
        product_name: productName.trim(),
        product_ID: productId.trim(),
        product_category: category.trim() || null,
        product_price: parseFloat(buyingPrice),
        product_quantity: parseInt(quantity),
        product_unit: unit.trim() || null,
        supplier_name: supplierName.trim() || null,
        supplier_number: supplierNumber.trim() || null,
        product_expiry: expiryDate || null,
        product_img: imageUrl,
        created_at: new Date().toISOString(),
      };

      // Insert product
      const { data: insertedProducts, error: insertError } = await supabase
        .from("products")
        .insert([productData])
        .select();

      if (insertError) throw insertError;

      const newProduct = insertedProducts[0];

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Get staff name
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("staff_name")
        .eq("id", user.id);

      if (staffError) throw staffError;

      const staffName = staffData?.[0]?.staff_name || "Unknown";

      // Insert into logs
      const { error: logsError } = await supabase.from("logs").insert([
        {
          product_id: newProduct.id,
          product_name: newProduct.product_name,
          product_quantity: newProduct.product_quantity,
          product_category: newProduct.product_category,
          product_unit: newProduct.product_unit,
          product_expiry: newProduct.product_expiry,
          staff: staffName,
          product_action: "Add Product",
        },
      ]);

      if (logsError) throw logsError;

      setSuccess("Product added successfully!");

      // Redirect after 2s
      setTimeout(() => {
        setRender("product");
      }, 2000);
    } catch (error) {
      console.error("Error adding product:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset form function
  const resetForm = () => {
    setProductName("");
    setProductId("");
    setCategory("");
    setBuyingPrice("");
    setQuantity("");
    setUnit("");
    setSupplierName("");
    setSupplierNumber("");
    setExpiryDate("");
    removeImage();
    setError("");
    setSuccess("");
  };

  return (
    <Container
      fluid
      className="bg-white mx-5 my-4 rounded d-flex flex-column"
      style={{ width: "135vh", minHeight: "80vh" }}
    >
      <div className="d-flex flex-column align-items-center mb-4">
        <span className="mx-0 mt-5 mb-2 d-inline-block h4">Add Product</span>
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

      {barcodeModalShow && (
        <BarcodeModal
          show={barcodeModalShow}
          setBarcodeModalShow={setBarcodeModalShow}
          setProductId={setProductId}
        />
      )}

      {/* Form content - takes available space */}
      <div className="flex-grow-1">
        <Form onSubmit={handleAddProductButton}>
          <Row>
            <Col md={6}>
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
                    <InputGroup size="sm">
                      <Form.Control
                        type="text"
                        placeholder="Enter product ID"
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)} // ← Add this
                        required
                      />

                      <Button
                        variant="outline-secondary"
                        onClick={() => setBarcodeModalShow(true)}
                      >
                        <LuScanBarcode />
                      </Button>
                    </InputGroup>
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
                    />
                  </Col>
                </Form.Group>

                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formCategory"
                >
                  <Form.Label column sm={3} className="text-start">
                    Category
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="text"
                      placeholder="Enter category"
                      size="sm"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </Col>
                </Form.Group>

                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formBuyingPrice"
                >
                  <Form.Label column sm={3} className="text-start">
                    Buying Price
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter buying price"
                      size="sm"
                      value={buyingPrice}
                      onChange={(e) => setBuyingPrice(e.target.value)}
                      required
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

                <Form.Group as={Row} className="mb-3 mt-4" controlId="formUnit">
                  <Form.Label column sm={3} className="text-start">
                    Unit
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="text"
                      placeholder="Enter product unit (e.g., kg, pcs, liters)"
                      size="sm"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
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
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </Col>
                </Form.Group>

                <Form.Group as={Row} className="mb-3 mt-4" controlId="formUnit">
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

                <Form.Group as={Row} className="mb-3 mt-4" controlId="formUnit">
                  <Form.Label column sm={3} className="text-start">
                    Supplier #
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="text"
                      placeholder="Enter supplier #"
                      size="sm"
                      value={supplierNumber}
                      onChange={(e) => setSupplierNumber(e.target.value)}
                    />
                  </Col>
                </Form.Group>
              </div>
            </Col>

            <Col md={5}>
              <div className="ms-3 mt-4">
                <Form.Group className="mb-4">
                  <Form.Label className="mb-3">Product Image</Form.Label>
                  <div
                    className={`border border-1 rounded p-4 text-center position-relative ${
                      dragActive ? "border-primary bg-light" : "border-dark"
                    }`}
                    style={{ minHeight: "365px", cursor: "pointer" }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() =>
                      document.getElementById("imageInput").click()
                    }
                  >
                    <input
                      id="imageInput"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: "none" }}
                    />

                    {imagePreview ? (
                      <div className="d-flex flex-column align-items-center justify-content-center h-100">
                        <div className="position-relative d-inline-block">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="img-fluid rounded"
                            style={{ maxHeight: "250px" }}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            className="position-absolute top-0 end-0 m-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage();
                            }}
                            style={{ fontSize: "10px" }}
                          >
                            ×
                          </Button>
                        </div>
                        <div className="mt-2">
                          <small className="text-muted">
                            {selectedImage?.name}
                          </small>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="d-flex flex-column align-items-center justify-content-center w-100 h-100"
                        style={{ minHeight: "300px" }}
                      >
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          className="text-muted mb-2"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21,15 16,10 5,21" />
                        </svg>
                        <p className="mb-1 text-muted text-center">
                          <strong>Click to upload</strong> or drag and drop
                        </p>
                        <p className="text-muted small text-center">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
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
              {loading ? "Adding Product..." : "Add Product"}
            </Button>
          </div>
        </Form>
      </div>
    </Container>
  );
};

export default AddProduct;
