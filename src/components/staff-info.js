import React, { useState, useRef, useEffect } from "react";
import { Row, Col, Container, Form } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import { User } from "lucide-react";
import { IoCloseOutline } from "react-icons/io5";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../supabaseClient";

const StaffInfo = ({ staffId, setRender }) => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const qrRef = useRef(null);

  const [staffName, setStaffName] = useState("");
  const [position, setPosition] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [staffBarcode, setStaffBarcode] = useState("");

  const [editing, setEditing] = useState(false); // ✅ track edit mode
  const [originalData, setOriginalData] = useState({}); // ✅ backup

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    let { data: staff, error } = await supabase
      .from("staff") // ✅ staff table
      .select("*")
      .eq("id", staffId)
      .single();

    if (error) {
      console.log(error);
    } else if (staff) {
      setStaffName(staff.staff_name);
      setPosition(staff.staff_position);
      setContactNumber(staff.staff_contact);
      setEmailAddress(staff.staff_email);
      setStaffBarcode(staff.staff_barcode);

      // ✅ load image from Supabase storage
      if (staff.staff_img) {
        const { data: publicUrlData, error: urlError } = supabase.storage
          .from("Smart-Inventory-System-(Pet Matters)")
          .getPublicUrl(staff.staff_img);

        if (!urlError) {
          setImagePreview(publicUrlData.publicUrl);
        } else {
          console.error("Error fetching public URL:", urlError);
        }
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
    if (editing) {
      // Cancel edits → reset form to original data
      setStaffName(originalData.staff_name);
      setPosition(originalData.staff_position);
      setContactNumber(originalData.staff_contact);
      setEmailAddress(originalData.staff_email);
      setEditing(false);
    } else {
      setEditing(true);
    }
  };

  const handleSave = async () => {
    let imagePath = originalData.staff_img; // keep old if no new upload

    if (image) {
      const fileExt = image.name.split(".").pop();
      const fileName = `${staffId}.${fileExt}`;
      const filePath = `products/${fileName}`; // ✅ store inside "products" folder

      const { error: uploadError } = await supabase.storage
        .from("Smart-Inventory-System-(Pet Matters)") // ✅ correct bucket
        .upload(filePath, image, { upsert: true });

      if (uploadError) {
        console.error(uploadError);
        return;
      }

      imagePath = filePath; // ✅ save path in DB
      // After successful upload
      const { data: publicUrlData } = supabase.storage
        .from("Smart-Inventory-System-(Pet Matters)")
        .getPublicUrl(filePath);

      setImagePreview(publicUrlData.publicUrl);
    }

    const { error } = await supabase
      .from("staff") // ✅ correct table
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
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
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
    link.download = `QRCode_${staffBarcode}.svg`;
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
                      cursor: editing ? "pointer" : "not-allowed",
                      opacity: editing ? 1 : 0.6, // dim when disabled
                    }}
                    onClick={() => {
                      if (editing) fileInputRef.current?.click();
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

                  {imagePreview &&
                    editing && ( // ✅ only show delete button in edit mode
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
                          setImage(null);
                          setImagePreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
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
                  disabled={!editing} // ✅ prevent selecting when not editing
                />
              </div>
            </Form.Group>

            {/* Info Fields */}
            <Form.Group className="mb-3">
              <Form.Label>Staff name</Form.Label>
              <Form.Control
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                disabled={!editing}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Position</Form.Label>
              <Form.Select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={!editing}
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contact Number</Form.Label>
              <Form.Control
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                disabled={!editing}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                disabled={!editing}
              />
            </Form.Group>
          </Form>
        </Col>

        {/* QR Section */}
        <Col
          md={6}
          className="d-flex flex-column justify-content-center align-items-center gap-3"
          style={{ minHeight: "400px" }}
          ref={qrRef}
        >
          <QRCodeSVG value={staffBarcode} size={128} />
          <Button variant="primary" onClick={downloadQRCode} className="my-5">
            Download QR Code
          </Button>
        </Col>
      </Row>

      {/* Action Buttons */}
      <div className="mt-auto mb-3 me-3 d-flex gap-3 justify-content-end">
        <Button variant="danger">Delete</Button>
        <Button variant="secondary" onClick={handleEditToggle}>
          {editing ? "Cancel" : "Edit"}
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!editing}>
          Save
        </Button>
      </div>
    </Container>
  );
};

export default StaffInfo;
