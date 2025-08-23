import { Row, Col } from "react-bootstrap";
import Charts from "./charts";
import InventorySummary from "./inventory-summary";
import StaffSummary from "./staff-summary";
import ReleasedStocks from "./released-stocks";
import NearExpiration from "./near-expiration";
import AddedStocks from "./added-stocks";
import LowStocks from "./low-stocks";


const AdminDashboard = () => {
    return ( 
        <div>

              <Row>
              <Col md={8}>
                <Charts />
              </Col>
              <Col md={4}>
                <Row>
                  <Col>
                    <InventorySummary />
                  </Col>
                </Row>
                <Row>
                    <Col>
                    <StaffSummary />
                    </Col>
                </Row>
              </Col>
            </Row>
            <Row>
                <Col md={8}>
                    <ReleasedStocks />
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