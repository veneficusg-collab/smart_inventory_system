import { Col, Container, Image } from "react-bootstrap";
import Row from "react-bootstrap/Row";
import Sidebar from "../components/sidebar";
import Header from "../components/header";
import Charts from "../components/charts";
import InventorySummary from "../components/inventory-summary";
import StaffSummary from "../components/staff-summary";
import ReleasedStocks from "../components/released-stocks";
import NearExpiration from "../components/near-expiration";
import AddedStocks from "../components/added-stocks";
import LowStocks from "../components/low-stocks";
import AdminDashboard from "../components/Admin-Dashboard";
import OverallInventory from "../components/overall-inventory";
import Product from "../components/product-table";
import Inventory from "../components/Inventory";

const Dashboard = () => {
  return (
    <Container fluid className="p-0">
      <Row className="w-100 m-0">
        <Col lg={2} className="" style={{ borderRight: "1px solid #ccc" }}>
          <Sidebar />
        </Col>
        <Col lg={10} className="p-0" style={{ backgroundColor: "#f2f2f2ff" }}>
          <Header />

            {/* <AdminDashboard /> */}
           <Inventory />

        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
