import { Col, Container } from "react-bootstrap";
import Row from "react-bootstrap/Row";
import Sidebar from "../components/sidebar";
import Header from "../components/header";
import AdminDashboard from "../components/Admin-Dashboard";
import Inventory from "../components/Inventory";
import Reports from "../components/Report";
import ManageStaff from "../components/Manage-Staff";
import StaffInfo from "../components/staff-info";
import Logs from "../components/Logs";
import StaffDashboard from "../components/StaffDashboard";
import StaffRestock from "../components/Staff-restock";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import StaffUnstock from "../components/Staff-unstock";

const Dashboard = () => {
  const [render, setRender] = useState("AdminDashboard");
  const [staffId, setStaffId] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [scannedId, setScannedId] = useState('');

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    setDefaultRender();
  }, [staffRole]); // runs when staffRole updates

  const setDefaultRender = () => {
    if (staffRole === "staff") setRender("StaffDashboard");
    else setRender("AdminDashboard");
  };

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let { data: staff, error } = await supabase
      .from("staff")
      .select("staff_position")
      .eq("id", user.id)
      .single();

    if (error) {
      console.log(error);
    } else {
      setStaffRole(staff.staff_position); // just the string
      console.log("Role:", staff.staff_position);
    }
  };

  // Admin view
  return (
    <Container fluid className="p-0">
      <Row className="w-100 m-0">
        <Col lg={2} style={{ borderRight: "1px solid #ccc" }}>
          <Sidebar setRender={setRender} staffRole={staffRole} />
        </Col>
        <Col lg={10} className="p-0" style={{ backgroundColor: "#f2f2f2ff" }}>
          <Header />
          {/* Admin Links */}
          {render === "AdminDashboard" && <AdminDashboard />}
          {render === "Inventory" && <Inventory />}
          {render === "Reports" && <Reports />}
          {render === "ManageStaff" && (
            <ManageStaff setStaffId={setStaffId} setRender={setRender} />
          )}
          {render === "StaffInfo" && (
            <StaffInfo staffId={staffId} setRender={setRender} />
          )}
          {render === "Logs" && <Logs />}

          {/* Staff Links */}
          {render === "StaffDashboard" && (
            <StaffDashboard setScannedId={setScannedId} setRender={setRender} />
          )}
          {render === "Restock" && (
            <StaffRestock scannedId={scannedId} setRender={setRender} />
          )}
          {render === "Unstock" && (
            <StaffUnstock scannedId={scannedId} setRender={setRender} />
          )}


        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
