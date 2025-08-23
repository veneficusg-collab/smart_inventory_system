import { Col, Container, Row } from "react-bootstrap";
import { FaRegCircleUser } from "react-icons/fa6";
import { FaClipboardList } from "react-icons/fa6";

const StaffSummary = () => {
  return (
    <Container className="bg-white mx-4 rounded text-center" style={{ width: "360px", marginTop:"31px"}}>
      <span
        className="mx-0 mt-3 mb-2 d-inline-block "
        style={{ fontWeight: "10px" }}
      >
        Staff Summary
      </span>
      <Row>
        <Col md={6} className="border-end">
          <div className="d-flex flex-column align-items-center my-4">
            <FaRegCircleUser />
            <span className="mx-0 m-1 d-inline-block">31</span>
            <span className="mx-0 mt-0 d-inline-block">Number of Staff</span>
          </div>
        </Col>
        <Col md={6} className="border-start">
          <div className="d-flex flex-column align-items-center my-4">
            <FaClipboardList />
            <span className="mx-0 mt-2 d-inline-block">21</span>
            <span className="mx-0 mt-0 d-inline-block">Number of Category</span>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default StaffSummary;
