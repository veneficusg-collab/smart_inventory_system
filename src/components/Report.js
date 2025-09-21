import { Col, Container, Row } from "react-bootstrap";
import TopRestockProducts from "./top-restock";
import StockCharts from "./stock-charts";
import TopUnstockProducts from "./top-unstock";
import TopSellingProducts from "./top-selling-products";
import BottomSellingProducts from "./bottom-selling-products";

const Reports = () => {
  return (
    <Container className="">
      <Row> 
        <Col md={6}>
            <TopSellingProducts />
        </Col>
        <Col md={6}>
            <BottomSellingProducts />
        </Col>
      </Row>
      <Row>
        <Col md={12}>
            <StockCharts />
        </Col>
      </Row>
      <Row>
        <Col md={6}>
            <TopRestockProducts />
        </Col>
        <Col md={6}>
            <TopUnstockProducts />
        </Col>
      </Row>
    </Container>
  );
};

export default Reports;
