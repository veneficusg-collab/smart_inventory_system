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
import Inventory from "../components/Inventory";
import Reports from "../components/Report";
import ManageStaff from "../components/Manage-Staff";
import StaffInfo from "../components/staff-info";
import { useState } from "react";
import Logs from "../components/Logs";

const Dashboard = () => {
  const [render, setRender] = useState('AdminDashboard');
  const [staffId, setStaffId] = useState('');
  return (
    <Container fluid className="p-0">
      <Row className="w-100 m-0">
        <Col lg={2} className="" style={{ borderRight: "1px solid #ccc" }}>
          <Sidebar setRender={setRender} />
        </Col>
        <Col lg={10} className="p-0" style={{ backgroundColor: "#f2f2f2ff" }}>
          <Header />
          {render === 'AdminDashboard' && <AdminDashboard />}
          {render ==='Inventory' && <Inventory />}
          {render === 'Reports' && <Reports />}
          {render === 'ManageStaff' && <ManageStaff setStaffId={setStaffId} setRender={setRender} />}
          {render === 'StaffInfo' && <StaffInfo staffId={staffId} />}
          {render === 'Logs' && <Logs />}
            {/* <AdminDashboard /> */}

           {/* <Inventory /> */}
           {/* <Reports /> */}
           {/* <ManageStaff /> */}
           {/* <StaffInfo /> */}

        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
