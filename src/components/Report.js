import Link from "@mui/material/Link";
import { Col, Container, Row } from "react-bootstrap";
import TopSellingProducts from "./top-selling";
import LowSellingProducts from "./low-selling";
import StockCharts from "./stock-charts";
import LogComponent from "./log-component";

const Reports = () => {
  return (
    <Container className="">
      <Row>
        <Col md={6}>
            <TopSellingProducts />
        </Col>
        <Col md={6}>
            <LowSellingProducts />
        </Col>
      </Row>
      <Row>
        <Col md={12}>
            <StockCharts />
        </Col>
      </Row>
      <Row>
        <Col>
            <LogComponent />
        </Col>
      </Row>
    </Container>
  );
};

export default Reports;
