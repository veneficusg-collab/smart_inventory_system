import { Row, Col } from "react-bootstrap";
import Charts from "./charts";
import SuggestedPurchase from "./suggested-purchase"
import AvoidPurchase from "./avoid-purchase"
import BestSellingToday from "./best-selling-today";

import NearExpiration from "./near-expiration";
import AddedStocks from "./added-stocks";
import LowStocks from "./low-stocks";
import ProfitChart from "./profit-chart";


const AdminDashboard = () => {
    return ( 
        <div>

              <Row>
              <Col md={8}>
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
              </Col>
            </Row>
            <Row>
                <Col md={8}>
                    <BestSellingToday />
                </Col>
                <Col md={4}>
                    <NearExpiration />
                </Col>
            </Row>
            <Row>
                <Col md={8}>
                    <AddedStocks />
                </Col>
                <Col md={4}>
                    <LowStocks />
                </Col>
            </Row>
        </div>
     );
}
 
export default AdminDashboard;