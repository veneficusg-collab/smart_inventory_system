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
  const [manualQrCode, setManualQrCode] = useState(""); // ✅ Manual QR code input state
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
    } else {
      navigate("/dashboard");
    }
  };

  // handle QR scan result
  const handleQrResult = async (result) => {
    try {
      if (!result) return;

      // works for both string and object outputs
      const qrValue = result;

      console.log("Scanned QR:", qrValue);

      // Query Supabase staff table
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("staff_barcode", qrValue)
        .single();

      if (error || !data) {
        alert(" Invalid QR code");
        return;
      }

      // Success → simulate login
      alert(` Welcome ${data.staff_name} (${data.staff_position})!`);
      localStorage.setItem("user", JSON.stringify(data));
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("QR login failed:", err.message);
    }
  };

  // ✅ Handle manual QR code submission
  const handleManualQrSubmit = async (e) => {
    e.preventDefault();
    if (!manualQrCode.trim()) {
      alert("Please enter a QR code");
      return;
    }
    await handleQrResult(manualQrCode);
    setManualQrCode(""); // Clear input after submission
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    let { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
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

            {/* Main Stock Room button — go to dedicated page */}
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
                placeholder="Enter your QR code"
                value={manualQrCode}
                onChange={(e) => setManualQrCode(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                Enter the QR code value from your staff ID
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