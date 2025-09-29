import { Row, Col } from "react-bootstrap";
import Charts from "./charts";
import SuggestedPurchase from "./suggested-purchase";
import AvoidPurchase from "./avoid-purchase";
import BestSellingToday from "./best-selling-today";

import NearExpiration from "./near-expiration";
import AddedStocks from "./added-stocks";
import LowStocks from "./low-stocks";
import ProfitChart from "./profit-chart";
import TotalSalesPerYear from "./total-sales-year";
import TotalProfitPerYear from "./total-profit-year";
import TotalExpensesPerYear from "./total-expenses-year";
import SalesRangeContainer from "./sales-range-container";


const AdminDashboard = () => {
  return (
    <div>
      <Row>
        <Col md={8}>
          <Row>
            <Col md={4}>
              <TotalSalesPerYear />
            </Col>
            <Col md={4}>
              <TotalProfitPerYear />
            </Col>
            <Col md={4}>
              <TotalExpensesPerYear />
            </Col>
          </Row>
          <Row>
            <Col>
              <SalesRangeContainer />
            </Col>
          </Row>
          <Row>
            <Col>
              <Charts />
            </Col>
          </Row>
          <Row>
            <Col>
              <ProfitChart />
            </Col>
          </Row>
        </Col>
        <Col md={4}>
          <Row>
            <Col>
              <SuggestedPurchase />
            </Col>
          </Row>
          <Row>
            <Col>
              <AvoidPurchase />
            </Col>
          </Row>
          <Row>
            <Col>
              <BestSellingToday />
            </Col>
          </Row>
          <Row>
            <Col>
              <NearExpiration />
            </Col>
          </Row>
          <Row>
            <Col>
              <AddedStocks />
            </Col>
          </Row>
          <Row>
            <Col>
              <LowStocks />
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
