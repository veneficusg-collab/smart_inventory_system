import { Col, Container, Row } from "react-bootstrap";
import { Form, Button } from "react-bootstrap";
import { useState } from "react";

const AddProduct = () => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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

  return (
    <Container
      fluid
      className="bg-white m-5 rounded d-flex flex-column"
      style={{ width: "135vh", minHeight: "80vh" }}
    >
      <div className="d-flex flex-column align-items-center mb-4 mt-1">
        <span className="mx-0 mt-5 mb-2 d-inline-block h4">Add Product</span>
      </div>

      {/* Form content - takes available space */}
      <div className="flex-grow-1">
        <Row>
          <Col md={6}>
            <Form className="ms-5">
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
                  />
                </Col>
              </Form.Group>

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
                    size="sm"
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
                    placeholder="Enter buying price"
                    size="sm"
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
                    placeholder="Enter quantity"
                    size="sm"
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
                    placeholder="Enter product unit"
                    size="sm"
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
                    placeholder="Enter expiry date"
                    size="sm"
                  />
                </Col>
              </Form.Group>
            </Form>
          </Col>

          <Col md={6}>
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
                  onClick={() => document.getElementById("imageInput").click()}
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
      </div>

      {/* Buttons fixed at bottom-right */}
      <div className="d-flex justify-content-end align-items-end p-3">
        <Button variant="secondary" type="button" size="sm" className="me-2">
          Cancel
        </Button>
        <Button variant="primary" type="submit" size="sm">
          Add Product
        </Button>
      </div>
    </Container>
  );
};

export default AddProduct;
