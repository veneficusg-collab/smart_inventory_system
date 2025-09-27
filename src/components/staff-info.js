import React, { useState, useRef, useEffect } from "react";
import { Row, Col, Container, Form } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import { User } from "lucide-react";
import { IoCloseOutline } from "react-icons/io5";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../supabaseClient";

const StaffInfo = ({ staffId, setRender, embedded = false }) => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const qrRef = useRef(null);

  const [staffName, setStaffName] = useState("");
  const [position, setPosition] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [staffBarcode, setStaffBarcode] = useState("");

  const [editing, setEditing] = useState(false);
  const [originalData, setOriginalData] = useState({});

  // In embedded mode, we keep it read-only
  const readOnly = embedded ? true : !editing;

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    let { data: staff, error } = await supabase
      .from("staff")
      .select("*")
      .eq("id", staffId)
      .single();

    if (error) {
      console.log(error);
    } else if (staff) {
      setStaffName(staff.staff_name || "");
      setPosition(staff.staff_position || "staff");
      setContactNumber(staff.staff_contact || "");
      setEmailAddress(staff.staff_email || "");
      setStaffBarcode(staff.staff_barcode || "");

      if (staff.staff_img) {
        const { data: publicUrlData, error: urlError } = supabase.storage
          .from("Smart-Inventory-System-(Pet Matters)")
          .getPublicUrl(staff.staff_img);
        if (!urlError) setImagePreview(publicUrlData.publicUrl);
      }

      setOriginalData({
        staff_name: staff.staff_name,
        staff_position: staff.staff_position,
        staff_contact: staff.staff_contact,
        staff_email: staff.staff_email,
        staff_img: staff.staff_img,
      });
    }
  };

  const handleEditToggle = () => {
    if (embedded) return; // no editing in modal
    if (editing) {
      // cancel
      setStaffName(originalData.staff_name || "");
      setPosition(originalData.staff_position || "staff");
      setContactNumber(originalData.staff_contact || "");
      setEmailAddress(originalData.staff_email || "");
      setImage(null);
      setEditing(false);
    } else {
      setEditing(true);
    }
  };

  const handleSave = async () => {
    if (embedded) return;
    let imagePath = originalData.staff_img;

    if (image) {
      const fileExt = image.name.split(".").pop();
      const fileName = `${staffId}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("Smart-Inventory-System-(Pet Matters)")
        .upload(filePath, image, { upsert: true });

      if (uploadError) {
        console.error(uploadError);
        return;
      }

      imagePath = filePath;
      const { data: publicUrlData } = supabase.storage
        .from("Smart-Inventory-System-(Pet Matters)")
        .getPublicUrl(filePath);
      setImagePreview(publicUrlData.publicUrl);
    }

    const { error } = await supabase
      .from("staff")
      .update({
        staff_name: staffName,
        staff_position: position,
        staff_contact: contactNumber,
        staff_email: emailAddress,
        staff_img: imagePath,
      })
      .eq("id", staffId);

    if (error) {
      console.error(error);
    } else {
      setOriginalData({
        staff_name: staffName,
        staff_position: position,
        staff_contact: contactNumber,
        staff_email: emailAddress,
        staff_img: imagePath,
      });
      setEditing(false);
    }
  };

  const handleImageChange = (file) => {
    if (file && file.type.startsWith("image/")) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
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
    link.download = `QRCode_${staffBarcode || "staff"}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ---- Layout wrappers (full vs embedded) ----
  const Wrapper = ({ children }) =>
    embedded ? (
      <div className="px-2 py-1" style={{ minWidth: 760, maxWidth: 980 }}>
        {children}
      </div>
    ) : (
      <Container
        className="bg-white m-4 rounded d-flex flex-column"
        style={{ width: "140vh", minHeight: "86vh" }}
      >
        {children}
      </Container>
    );

  return (
    <Wrapper>
      {!embedded && (
        <span
          className="mx-1 mt-3 d-inline-block fw-bold"
          style={{ fontSize: 20 }}
        >
          Staff Info
        </span>
      )}

      <Row className={embedded ? "mt-1" : ""}>
        {/* LEFT: avatar + form */}
        <Col md={7} className="px-3">
          {/* Avatar */}
          <div className="d-flex justify-content-center mt-3 mb-3">
            <div
              className="position-relative"
              style={{
                width: embedded ? 96 : 120,
                height: embedded ? 96 : 120,
              }}
            >
              <div
                className={`rounded-circle border d-flex align-items-center justify-content-center position-relative overflow-hidden ${
                  imagePreview
                    ? "border-primary"
                    : "border-secondary border-2 border-dashed"
                }`}
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: imagePreview ? "transparent" : "#f8f9fa",
                  cursor: readOnly ? "default" : "pointer",
                  opacity: readOnly ? 0.9 : 1,
                }}
                onClick={() => {
                  if (!readOnly) fileInputRef.current?.click();
                }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile preview"
                    className="w-100 h-100"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <User size={embedded ? 30 : 40} className="text-secondary" />
                )}
              </div>

              {!readOnly && imagePreview && (
                <Button
                  variant="danger"
                  size="sm"
                  className="position-absolute rounded-circle p-1"
                  style={{
                    top: 5,
                    right: 5,
                    width: 25,
                    height: 25,
                    fontSize: 12,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setImage(null);
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <IoCloseOutline className="mb-1" />
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e.target.files[0])}
              className="d-none"
              disabled={readOnly}
            />
          </div>

          {/* Form */}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Staff name</Form.Label>
              <Form.Control
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                disabled={readOnly}
                size="sm"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Position</Form.Label>

              {embedded ? (
                // 🔹 Read-only text in modal
                <Form.Control
                  readOnly
                  value={position === "admin" ? "Admin" : "Staff"}
                  size="sm"
                  disabled
                />
              ) : (
                // 🔹 Editable select in full-page
                <Form.Select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  disabled={readOnly}
                  size="sm"
                >
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </Form.Select>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contact Number</Form.Label>
              <Form.Control
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                disabled={readOnly}
                size="sm"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                disabled={readOnly}
                size="sm"
              />
            </Form.Group>
          </Form>
        </Col>

        {/* RIGHT: QR + button */}
        <Col
          md={5}
          className="d-flex flex-column align-items-center justify-content-center"
          ref={qrRef}
          style={{ gap: 16 }}
        >
          <QRCodeSVG value={staffBarcode || ""} size={embedded ? 128 : 148} />
          <Button
            variant="primary"
            size="sm"
            onClick={downloadQRCode}
            className={embedded ? "mt-2" : "my-3"}
          >
            Download QR Code
          </Button>
        </Col>
      </Row>

      {/* Full-page action buttons (hidden in modal) */}
      {!embedded && (
        <div className="mt-auto mb-3 me-3 d-flex gap-3 justify-content-end">
          <Button variant="danger">Delete</Button>
          <Button variant="secondary" onClick={handleEditToggle}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!editing}>
            Save
          </Button>
        </div>
      )}
    </Wrapper>
  );
};

export default StaffInfo;
