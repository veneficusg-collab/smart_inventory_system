import React, { useState, useRef, useEffect } from "react";
import { Row, Col, Container, Form } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import { User } from "lucide-react";
import { IoCloseOutline } from "react-icons/io5";
import { QRCodeSVG } from "qrcode.react";
import {
  MdOutlineModeEdit,
  MdArrowBack,
  MdSave,
  MdClose,
  MdDelete,
} from "react-icons/md";
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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [originalData, setOriginalData] = useState({});

  // In embedded mode, we keep it read-only
  const readOnly = embedded ? true : !editing;

  useEffect(() => {
    fetchStaffData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // cancel -> revert
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

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${staffName}?`)) return;
    setDeleting(true);

    const { error } = await supabase.from("staff").delete().eq("id", staffId);

    setDeleting(false);

    if (!error) {
      alert("Staff deleted successfully.");
      setRender?.("ManageStaff");
    } else {
      console.error(error);
      alert("Failed to delete staff.");
    }
  };

  const handleSave = async () => {
    if (embedded) return;
    setSaving(true);
    let imagePath = originalData.staff_img;

    try {
      if (image) {
        const fileExt = image.name.split(".").pop();
        const fileName = `${staffId}.${fileExt}`;
        const filePath = `staffs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("Smart-Inventory-System-(Pet Matters)")
          .upload(filePath, image, { upsert: true });

        if (uploadError) throw uploadError;

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

      if (error) throw error;

      setOriginalData({
        staff_name: staffName,
        staff_position: position,
        staff_contact: contactNumber,
        staff_email: emailAddress,
        staff_img: imagePath,
      });
      setEditing(false);
      alert("Staff info updated.");
    } catch (err) {
      console.error(err);
      alert("Failed to save staff info.");
    } finally {
      setSaving(false);
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

  // ---------- VIEW ----------
  // Embedded (modal) — no grid, compact, centered; avatar + QR side-by-side
  if (embedded) {
    return (
      <Container
        fluid
        className="bg-white rounded d-flex flex-column align-items-center"
        style={{ width: "auto", padding: "1.25rem 1.5rem" }}
      >
        {/* Avatar + QR */}
        <div
          className="d-flex align-items-center justify-content-center mb-4"
          ref={qrRef}
          style={{ gap: 40 }}
        >
          {/* Avatar */}
          <div className="position-relative" style={{ width: 96, height: 96 }}>
            <div
              className={`rounded-circle border d-flex align-items-center justify-content-center overflow-hidden ${
                imagePreview
                  ? "border-primary"
                  : "border-secondary border-2 border-dashed"
              }`}
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: imagePreview ? "transparent" : "#f8f9fa",
                cursor: "default",
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
                <User size={30} className="text-secondary" />
              )}
            </div>
          </div>

          {/* QR + Download */}
          <div className="d-flex flex-column align-items-center">
            <QRCodeSVG value={staffBarcode || ""} size={110} />
            <Button
              variant="link"
              size="sm"
              onClick={downloadQRCode}
              style={{ padding: 0, fontSize: "0.75rem", marginTop: 4 }}
            >
              Download
            </Button>
          </div>
        </div>

        {/* Form (narrow + centered) */}
        <Form style={{ width: "100%", maxWidth: 420 }}>
          <Form.Group className="mb-3">
            <Form.Label>Personnel Name</Form.Label>
            <Form.Control type="text" value={staffName} disabled size="sm" />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Position</Form.Label>
            <Form.Control
              readOnly
              value={position === "admin" ? "Admin" : "Staff"}
              size="sm"
              disabled
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Contact Number</Form.Label>
            <Form.Control type="tel" value={contactNumber} disabled size="sm" />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email Address</Form.Label>
            <Form.Control type="email" value={emailAddress} disabled size="sm" />
          </Form.Group>
        </Form>
      </Container>
    );
  }

  // Full-page (non-embedded) — keeps previous layout
  return (
    <Container
      fluid
      className="bg-white m-5 rounded d-flex flex-column"
      style={{ width: "135vh", minHeight: "80vh" }}
    >
      {/* Header row: back button (left) + actions (right) */}
      <div className="d-flex justify-content-between align-items-center mb-4 mt-3 px-2">
        <Button
          variant="outline-secondary"
          size="sm"
          className="me-3"
          onClick={() => setRender?.("ManageStaff")}
          style={{ border: "none" }}
        >
          <MdArrowBack />
        </Button>

        <div className="d-flex gap-2">
          {editing ? (
            <>
              <Button
                variant="outline-success"
                size="sm"
                onClick={handleSave}
                disabled={saving || deleting}
              >
                <MdSave /> Save
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleEditToggle}
                disabled={saving || deleting}
              >
                <MdClose /> Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleEditToggle}
                disabled={saving || deleting}
              >
                <MdOutlineModeEdit /> Edit
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleDelete}
                disabled={saving || deleting}
              >
                <MdDelete /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <Row>
        {/* LEFT: avatar + form */}
        <Col md={7} className="px-3">
          {/* Avatar */}
          <div className="d-flex justify-content-center mt-3 mb-3">
            <div className="position-relative" style={{ width: 120, height: 120 }}>
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
                  <User size={40} className="text-secondary" />
                )}
              </div>

              {!readOnly && imagePreview && (
                <Button
                  variant="danger"
                  size="sm"
                  className="position-absolute rounded-circle p-1"
                  style={{ top: 5, right: 5, width: 25, height: 25, fontSize: 12 }}
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
              <Form.Select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={readOnly}
                size="sm"
              >
                <option value="admin">Admin</option>
                <option value="secretary">Secretary</option>
                <option value="staff">Staff</option>
              </Form.Select>
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
          style={{ gap: 16 }}
        >
          <div ref={qrRef} className="d-flex flex-column align-items-center">
            <QRCodeSVG value={staffBarcode || ""} size={148} />
            <Button variant="primary" size="sm" onClick={downloadQRCode} className="my-3">
              Download QR Code
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default StaffInfo;
