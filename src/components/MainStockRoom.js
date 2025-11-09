import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import StaffRetrieval from "../components/StaffRetrieval";

const MainStockRoom = () => {
  const navigate = useNavigate();

  return (
    <Container fluid className="min-vh-100 bg-light p-4">
      {/* top-left back button */}
      <Row className="mb-3">
        <Col>
          <Button variant="outline-primary" onClick={() => navigate("/")}>
            ← Back to Login
          </Button>
        </Col>
      </Row>

      {/* center StaffRetrieval both horizontally and vertically */}
      <Row
        className="justify-content-center align-items-center"
        style={{ minHeight: "calc(100vh - 80px)" }}
      >
        <Col xs={12} md={10} lg={8} xl={6}>
          <StaffRetrieval />
        </Col>
      </Row>
    </Container>
  );
};

export default MainStockRoom;