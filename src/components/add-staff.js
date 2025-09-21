import React, { useState, useRef } from "react";
import { Container, Form } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { User, Upload } from "lucide-react";
import { IoCloseOutline } from "react-icons/io5";
import Alert from "react-bootstrap/Alert";
import { supabase } from "../supabaseClient";

const AddStaff = (props) => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [staffName, setStaffName] = useState("");
  const [position, setPosition] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [img, setImg] = useState("");

  const handleAddStaff = async (e) => {
  e.preventDefault();

  if (password !== confirmPassword) {
    setErrorMessage("Confirm password didn't match!");
    return;
  }

  // Hybrid login check
  let adminId = null;
  let staffRole = null;

  // 1️⃣ Try Supabase Auth first
  const {
    data: { user: supaUser },
  } = await supabase.auth.getUser();

  if (supaUser) {
    adminId = supaUser.id;

    const { data: staff, error } = await supabase
      .from("staff")
      .select("staff_position")
      .eq("id", supaUser.id)
      .single();

    if (error || !staff || staff.staff_position !== "admin") {
      setErrorMessage("You must be an admin to add staff");
      return;
    }

    staffRole = staff.staff_position;
  } else {
    // 2️⃣ Fallback: QR login
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const qrUser = JSON.parse(storedUser);
      adminId = qrUser.id;
      staffRole = qrUser.staff_position;
    }
  }

  if (!adminId || staffRole !== "admin") {
    setErrorMessage("No admin session found! Relogin using Email and Password.");
    return;
  }

  // 🚨 IMPORTANT
  // You cannot call supabase.auth.signUp() with just QR login.
  // That requires a Supabase Auth session (or service role key).
  // So at this point you have two choices:

  // ✅ Option A: If you are logged in with Supabase Auth
  // You can directly call supabase.auth.signUp()
  if (supaUser) {
    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setErrorMessage(signUpError.message);
      return;
    }

    // Insert into staff table
    const user = signUpData.user;
    const staffBarcode = "P" + Math.floor(100000 + Math.random() * 900000);

    const { error: staffError } = await supabase.from("staff").insert([
      {
        id: user.id,
        staff_name: staffName,
        staff_position: position,
        staff_contact: contactNumber,
        staff_email: email,
        staff_barcode: staffBarcode,
      },
    ]);

    if (staffError) {
      setErrorMessage(staffError.message);
      return;
    }

    setSuccessMessage("New Staff Added Successfully!");
    setTimeout(() => window.location.reload(), 3000);
  }

  // ✅ Option B: If you are logged in with QR
  // Call your own backend API (with Supabase service role key)
  // Example: await fetch("/api/add-staff", { method: "POST", body: JSON.stringify({ email, password, staffName, position, contactNumber }) })
};




  const handleImageChange = (file) => {
    if (file && file.type.startsWith("image/")) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setImg(reader);
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

  return (
    <Container>
      <Modal
        {...props}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            New Staff
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form id="addStaffForm" onSubmit={handleAddStaff}>
            {/* Image Upload Section */}
            <Form.Group className="mb-4 text-center">
              <Form.Label>Profile Picture</Form.Label>
              <div className="d-flex flex-column align-items-center">
                {/* Circular Image Preview */}
                <div
                  className="position-relative mb-3"
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
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Position</Form.Label>
              <Form.Select
                required
                type="text"
                placeholder="Enter position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                <option value="" disabled>
                  -- Select Position --
                </option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contact Number</Form.Label>
              <Form.Control
                required
                type="tel"
                placeholder="Enter contact number"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                required
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                required
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                required
                type="password"
                placeholder="Enter confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Form.Group>
            {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
            {successMessage && (
              <Alert variant="success">{successMessage}</Alert>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={props.onHide}>
            Close
          </Button>
          <Button variant="primary" type="submit" form="addStaffForm">
            Add Staff
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AddStaff;
