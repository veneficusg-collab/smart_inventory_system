import { useState, useEffect } from "react";
import { Form, Button, Container, Row, Col } from "react-bootstrap";
import { supabase } from "../supabaseClient"; // Assuming same path to your Supabase client
import { useNavigate } from "react-router-dom";

const ResetPasswordForm = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 1. Initial check (optional but good practice):
  // You might want to check if a session is active, though Supabase handles much of this on redirect.
  useEffect(() => {
    // Check if the user is authenticated after the redirect from the email link
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            // Optional: Redirect if the session wasn't properly set up by the email link
            // alert("Session not found. Please try the reset link again.");
            // navigate('/login');
        }
    };
    checkSession();
  }, [navigate]);


  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      // 2. Update the user's password in Supabase
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("Password reset error:", error);
        alert("Password reset failed: " + error.message);
      } else {
        alert("Success! Your password has been reset. You are now logged in.");
        // 3. Redirect to a safe page (e.g., dashboard)
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("An unexpected error occurred:", err);
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="min-vh-100 d-flex align-items-center justify-content-center">
      <Row className="w-100">
        <Col xs={12} md={6} lg={4} className="mx-auto">
          <div className="text-center mb-4">
            <h2>Set New Password</h2>
            <p>Enter your new password below.</p>
          </div>
          
          <Form onSubmit={handlePasswordReset}>
            <Form.Group className="mb-3" controlId="newPassword">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-4" controlId="confirmPassword">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              className="w-100"
              disabled={loading || newPassword.length < 6}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPasswordForm;