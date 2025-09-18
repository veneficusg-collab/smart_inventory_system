import { Col, Container, Row } from "react-bootstrap";
import TopRestockProducts from "./top-restock";
import StockCharts from "./stock-charts";
import TopUnstockProducts from "./top-unstock";
import TopUnstockCategories from "./top-unstock-category";
import TopRestockCategories from "./top-restock-category";

const Reports = () => {
  return (
    <Container className="">
      <Row> 
        <Col md={6}>
            <TopRestockProducts />
        </Col>
        <Col md={6}>
            <TopUnstockProducts />
        </Col>
      </Row>
      <Row>
        <Col md={12}>
            <StockCharts />
        </Col>
      </Row>
      <Row>
        <Col md={6}>
            <TopRestockCategories />
        </Col>
        <Col md={6}>
            <TopUnstockCategories />
        </Col>
      </Row>
    </Container>
  );
};

export default Reports;
