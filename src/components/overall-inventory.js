import { Container } from "react-bootstrap";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

const OverallInventory = () => {
  return (
    <Container
      fluid
      className="bg-white m-4 rounded"
      style={{ width: "140vh" }}
    >
      <span
        className="mx-0 mt-3 mb-2 d-inline-block "
        style={{ fontWeight: "10px" }}
      >
        Overall Inventory
      </span>
      <Row>
        <Col md={3} className="border-end">
          <div className="d-flex flex-column align-items-start mb-4 mt-1">
            <span
              className="mx-0 m-1 d-inline-block"
              style={{ color: "blue", fontWeight: "blod" }}
            >
              Categories
            </span>
            <span className="mx-0 m-1 d-inline-block">14</span>
            <span
              className="mx-0 mt-0 d-inline-block"
              style={{ color: "grey", fontWeight: "lighter" }}
            >
              Last 7 days
            </span>
          </div>
        </Col>
        <Col md={3} className="border-end">
          <div className="d-flex flex-column align-items-start mt-1">
            <span
              className="mx-0 m-1 d-inline-block"
              style={{ color: "#ffc60a" }}
            >
              Total Product
            </span>

            <div className="d-flex justify-content-between w-100">
              <div className="me-3">
                <div className="fw-bold">868</div>
                <small className="text-muted">Last 7 days</small>
              </div>
              <div>
                <div className="fw-bold">₱25000</div>
                <small className="text-muted">Revenue</small>
              </div>
            </div>
          </div>
        </Col>

        <Col md={3} className="border-end">
          <div className="d-flex flex-column align-items-start mt-1">
            <span
              className="mx-0 m-1 d-inline-block"
              style={{ color: "#e20affff" }}
            >
              Top Selling
            </span>


            <div className="d-flex justify-content-between w-100">
              <div className="me-3">
                <div className="fw-bold">5</div>
                <small className="text-muted">Last 7 days</small>
              </div>
              <div>
                <div className="fw-bold">₱2500</div>
                <small className="text-muted">Cost</small>
              </div>
            </div>
          </div>
        </Col>
        <Col md={3}>
         <div className="d-flex flex-column align-items-start mt-1">
            <span
              className="mx-0 m-1 d-inline-block"
              style={{ color: "#ff3b0aff" }}
            >
              Low Stocks
            </span>

            <div className="d-flex justify-content-between w-100">
              <div className="me-3">
                <div className="fw-bold">12</div>
                <small className="text-muted">Ordered</small>
              </div>
              <div>
                <div className="fw-bold">2</div>
                <small className="text-muted">Not in stock</small>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default OverallInventory;
