import React, { useState, useRef } from "react";
import { Row, Col, Container, Form } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import { User, Upload } from "lucide-react";
import { IoCloseOutline } from "react-icons/io5";
import { QRCodeSVG } from "qrcode.react";

const StaffInfo = ({ staffId, setRender }) => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const qrRef = useRef(null);
  const id = "MIKE ANDRE";

  const [staffName, setStaffName] = useState("");
  const [position, setPosition] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");

  const handleImageChange = (file) => {
    if (file && file.type.startsWith("image/")) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    handleImageChange(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleImageChange(file);
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadQRCode = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `QRCode_${id}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container
      className="bg-white m-4 rounded"
      style={{ width: "140vh", height: "86vh" }}
    >
      <span
        className="mx-1 mt-3 d-inline-block"
        style={{ fontSize: "20px", fontWeight: "bold" }}
      >
        Staff Info
      </span>
      <Row>
        <Col md={6}>
          <Form>
            {/* Image Upload Section */}
            <Form.Group className="my-4">
              {/* <Form.Label className="text-center d-block">Profile Picture</Form.Label> */}
              <div className="d-flex align-items-center justify-content-center gap-4">
                {/* Circular Image Preview */}
                <div
                  className="position-relative"
                  style={{ width: "120px", height: "120px" }}
                >
                  <div
                    className={`rounded-circle border d-flex align-items-center justify-content-center position-relative overflow-hidden ${
                      imagePreview
                        ? "border-primary"
                        : "border-secondary border-2 border-dashed"
                    }`}
                    style={{
                      width: "120px",
                      height: "120px",
                      backgroundColor: imagePreview ? "transparent" : "#f8f9fa",
                      cursor: "pointer",
                    }}
                    onClick={handleClickUpload}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="w-100 h-100"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <User size={40} className="text-secondary" />
                    )}
                  </div>

                  {imagePreview && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="position-absolute rounded-circle p-1"
                      style={{
                        top: "5px",
                        right: "5px",
                        width: "25px",
                        height: "25px",
                        fontSize: "12px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                    >
                      <IoCloseOutline className="mb-1" />
                    </Button>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="d-none"
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Staff name</Form.Label>
              <Form.Control
                required
                type="text"
                placeholder="Enter staff name"
                input={id}
                onChange
                disabled
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Position</Form.Label>
              <Form.Control
                required
                type="text"
                placeholder="Enter position"
                disabled
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contact Number</Form.Label>
              <Form.Control
                required
                type="tel"
                placeholder="Enter contact number"
                disabled
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                required
                type="email"
                placeholder="Enter email address"
                disabled
              />
            </Form.Group>
          </Form>
        </Col>
        <Col
          md={6}
          className="d-flex flex-column justify-content-center align-items-center gap-3"
          style={{ minHeight: "400px" }}
          ref={qrRef}
        >
          <QRCodeSVG value={id} size={128} />
          <Button variant="primary" onClick={downloadQRCode} className="my-5">
            Download QR Code
          </Button>
        </Col>
      </Row>
      <Row></Row>
      <div className="mt-auto mb-3 me-3 d-flex gap-3 justify-content-end">
    <Button variant="danger">Delete</Button>
    <Button variant="secondary">Edit</Button>
    <Button variant="primary">Save</Button>
  </div>
    </Container>
  );
};

export default StaffInfo;
