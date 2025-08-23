import { useState } from "react";
import { Form, Button, Container, Row, Col } from "react-bootstrap";
import Image from "react-bootstrap/Image";
import logo from "../logo.png"

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login attempt:", { email, password });
  };

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center">
      <Row className="w-100">
        {/* Empty left column to push form to the right */}
        <Col
          lg={6}
          className="  d-flex justify-content-center align-items-center"
          style={{ minHeight: "100vh" }}
        >
          <Image
            src={logo}
            className=" "
            style={{ width: "300px" }}
          ></Image>
        </Col>

        {/* Right column with form */}
        <Col
          xs={12}
          lg={6}
          className="d-flex align-items-center justify-content-center"
          style={{}}
        >
          <div
            className="w-100"
            style={{ maxWidth: "400px", backgroundColor: "" }}
          >
            <div className="text-center">
              <Image
                src={logo}
                className=" "
                style={{ width: "50px" }}
              ></Image>
            </div>

            <div className="text-center mb-4">
              <h2>Log in to your account</h2>
              <p>Welcome back! Please enter your details.</p>
            </div>

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
                <Form.Group className="" controlId="showPassword">
                  <Form.Check
                    type="checkbox"
                    label="Show Password"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                </Form.Group>

                <Button variant="link" size="sm" style={{marginTop:"-3px"}}>
                  Forgot password?
                </Button>
              </div>

              <Button variant="primary" type="submit" className="w-100 mb-2">
                Sign in
              </Button>

              <Button
                variant="outline-secondary"
                type="button"
                className="w-100 mb-3"
              >
                Sign in using QR code
              </Button>

              <div className="text-center">
                <Button variant="link" size="sm">
                  Log in as Staff
                </Button>
              </div>
            </Form>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginForm;
