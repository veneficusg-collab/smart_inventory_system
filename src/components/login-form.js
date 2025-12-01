import { useState } from "react";
import { Form, Button, Container, Row, Col, Modal } from "react-bootstrap";
import Image from "react-bootstrap/Image";
import logo from "../logo.png";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import QrScannerZXing from "./QrScannerZXing";

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [manualQrCode, setManualQrCode] = useState("");
  const navigate = useNavigate();

  // email/password login
  const handleSubmit = async (e) => {
    e.preventDefault();

    let { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(error);
      alert("Login failed: " + error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: staff, error: staffError } = await supabase
        .from("staff")
        .select("staff_position")
        .eq("id", user.id)
        .single();

      if (staffError) {
        console.log(staffError);
        alert("Error fetching staff information");
        await supabase.auth.signOut();
        return;
      }

      if (staff.staff_position === "staff") {
        alert(
          "Access denied. Only administrators and secretaries can log in through this portal."
        );
        await supabase.auth.signOut();
        return;
      }

      navigate("/dashboard");
    }
  };

  // ✅ FIXED: Handle QR code (either scanned or manual input)
  const handleQrResult = async (qrCodeValue) => {
    try {
      if (!qrCodeValue) return;

      console.log("QR Code Value:", qrCodeValue);

      // Parse QR code if it's a JSON string
      let staffData;
      try {
        staffData =
          typeof qrCodeValue === "string"
            ? JSON.parse(qrCodeValue)
            : qrCodeValue;
      } catch (parseError) {
        // If parsing fails, treat it as a staff ID and fetch from database
        console.log("QR code is not JSON, treating as staff ID");
        const { data, error } = await supabase
          .from("staff")
          .select("id, staff_name, staff_position, staff_img")
          .eq("id", qrCodeValue)
          .single();

        if (error || !data) {
          alert("Invalid QR code. Staff not found.");
          return;
        }
        staffData = data;
      }

      // Validate staff data structure
      if (!staffData.id || !staffData.staff_position) {
        alert("Invalid QR code format");
        return;
      }

      // Check staff role
      if (staffData.staff_position === "staff") {
        alert(
          "Access denied. Only administrators and secretaries can log in through this portal."
        );
        return;
      }

      // Store staff data in localStorage
      localStorage.setItem("user", JSON.stringify(staffData));

      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event("qr-login"));

      alert(`Welcome ${staffData.staff_name} (${staffData.staff_position})!`);

      // Close modal and redirect
      setShowModal(false);
      navigate("/dashboard");
    } catch (err) {
      console.error("QR login failed:", err);
      alert("QR login failed: " + err.message);
    }
  };

  // Handle manual QR code submission
  const handleManualQrSubmit = async (e) => {
    e.preventDefault();
    if (!manualQrCode.trim()) {
      alert("Please enter a QR code");
      return;
    }
    await handleQrResult(manualQrCode);
    setManualQrCode("");
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    let { error } = await supabase.auth.resetPasswordForEmail(
      forgotPasswordEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );
    if (error) {
      console.log(error);
      alert("Forgot password failed: " + error.message);
    } else {
      alert("Password reset email sent. Please check your email.");
      setShowForgotPasswordModal(false);
    }
  };

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center">
      <Row className="w-100">
        {/* Left side logo */}
        <Col
          lg={6}
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "100vh" }}
        >
          <Image src={logo} style={{ width: "300px" }} />
        </Col>

        {/* Right side login form */}
        <Col
          xs={12}
          lg={6}
          className="d-flex align-items-center justify-content-center"
        >
          <div className="w-100" style={{ maxWidth: "400px" }}>
            <div className="text-center">
              <Image src={logo} style={{ width: "50px" }} />
            </div>

            <div className="text-center mb-4">
              <h2>Log in to your account</h2>
              <p>Welcome back! Please enter your details.</p>
            </div>

            {/* Email/password form */}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="email">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Form.Group>

              <div className="d-flex justify-content-between mb-3">
                <Form.Group controlId="showPassword">
                  <Form.Check
                    type="checkbox"
                    label="Show Password"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                </Form.Group>

                <Button
                  variant="link"
                  size="sm"
                  style={{ marginTop: "-3px" }}
                  onClick={() => setShowForgotPasswordModal(true)}
                >
                  Forgot password?
                </Button>
              </div>

              <Button variant="primary" type="submit" className="w-100 mb-2">
                Sign in
              </Button>
            </Form>

            {/* QR login button */}
            <Button
              variant="success"
              className="w-100"
              onClick={() => setShowModal(true)}
            >
              Login with QR Code
            </Button>

            {/* Main Stock Room button */}
            <Button
              variant="secondary"
              className="w-100 mt-2"
              onClick={() => navigate("/main-stock-room")}
            >
              Main Stock Room
            </Button>
          </div>
        </Col>
      </Row>

      {/* QR Scanner Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        size="md"
      >
        <Modal.Header closeButton>
          <Modal.Title>Scan your Staff QR</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* QR Scanner Component */}
          <div className="mb-4">
            <QrScannerZXing onResult={handleQrResult} />
          </div>

          {/* Divider */}
          <div className="d-flex align-items-center my-4">
            <div className="flex-grow-1 border-top"></div>
            <div className="px-3">OR</div>
            <div className="flex-grow-1 border-top"></div>
          </div>

          {/* Manual QR Code Input */}
          <Form onSubmit={handleManualQrSubmit}>
            <Form.Group className="mb-3" controlId="manualQrCode">
              <Form.Label>Enter QR Code Manually</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your QR code or staff ID"
                value={manualQrCode}
                onChange={(e) => setManualQrCode(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                Enter the QR code value or staff ID from your staff credentials
              </Form.Text>
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100">
              Submit QR Code
            </Button>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal
        show={showForgotPasswordModal}
        onHide={() => setShowForgotPasswordModal(false)}
        centered
        size="md"
      >
        <Modal.Header closeButton>
          <Modal.Title>Forgot Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleForgotPassword}>
            <Form.Group className="mb-3" controlId="forgotPasswordEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter your email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
              />
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100">
              Send Reset Password Email
            </Button>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowForgotPasswordModal(false)}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default LoginForm;
