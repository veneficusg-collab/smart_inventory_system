import { Col, Container, Row } from "react-bootstrap";
import { FaBox } from "react-icons/fa";
import { CiLocationOn } from "react-icons/ci";

const InventorySummary = () => {
  return (
    <Container className="bg-white m-4 rounded text-center" style={{ width: "360px" }}>
      <span className="mx-0 mt-3 mb-2 d-inline-block " style={{fontWeight:"10px"}}>Inventory Summary</span>
      <Row>
        <Col md={6} className="border-end">
          <div className="d-flex flex-column align-items-center my-4">
            <FaBox />
            <span className="mx-0 m-1 d-inline-block">868</span>
            <span className="mx-0 mt-0 d-inline-block">Quantity in Hand</span>
          </div>
        </Col>
        <Col md={6} className="border-start">
          <div className="d-flex flex-column align-items-center my-4">
            <CiLocationOn />
            <span className="mx-0 mt-1 d-inline-block">200</span>
            <span className="mx-0 mt-0 d-inline-block">To be receive</span>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default InventorySummary;
