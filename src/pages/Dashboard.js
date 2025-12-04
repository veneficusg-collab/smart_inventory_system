import { Col, Container, Spinner } from "react-bootstrap";
import Row from "react-bootstrap/Row";
import Sidebar from "../components/sidebar";
import Header from "../components/header";
import AdminDashboard from "../components/Admin-Dashboard";
import Inventory from "../components/Inventory";
import ManageStaff from "../components/Manage-Staff";
import StaffInfo from "../components/staff-info";
import Logs from "../components/Logs";
import StaffDashboard from "../components/StaffDashboard";
import StaffRestock from "../components/Staff-restock";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import StaffUnstock from "../components/Staff-unstock";
import POS from "../components/POS";
import Archive from "../components/Archive";
import DTR from "../components/DTR";
import MainInventory from "../components/MainInventory";
import MainArchive from "../components/MainArchive";
import StaffRetrieval from "../components/StaffRetrieval";
import PharmacySecretary from "../components/PharmacySecretary";
import { NotificationProvider } from "../components/NotificationContext";

const Dashboard = () => {
  const [render, setRender] = useState("AdminDashboard");
  const [staffId, setStaffId] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [staffName, setStaffName] = useState("");
  const [scannedId, setScannedId] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Store current page for sidebar highlighting
  const [currentPage, setCurrentPage] = useState("");

  const setDefaultRender = useCallback(() => {
    if (staffRole === "staff") {
      setRender("StaffDashboard");
      setCurrentPage("StaffDashboard");
    } else if (staffRole === "secretary") {
      setRender("PharmacySecretary");
      setCurrentPage("PharmacySecretary");
    } else {
      setRender("AdminDashboard");
      setCurrentPage("AdminDashboard");
    }
  }, [staffRole]);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (staffRole) {
      setDefaultRender();
      setLoading(false);
    }
  }, [staffRole, setDefaultRender]);

  useEffect(() => {
    (async () => {
      await archiveExpiredProducts();
      await archiveZeroStockProducts();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update currentPage whenever render changes
  useEffect(() => {
    setCurrentPage(render);
  }, [render]);

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        let { data: staff, error } = await supabase
          .from("staff")
          .select("staff_name, staff_position")
          .eq("id", user.id)
          .single();

        if (!error && staff) {
          setStaffRole(staff.staff_position);
          setStaffId(user.id);
          setStaffName(staff.staff_name || "");
        } else {
          console.error("Staff fetch error:", error);
          setLoading(false);
        }
      } else {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const qrUser = JSON.parse(storedUser);
          setStaffRole(qrUser.staff_position);
          setStaffId(qrUser.id);
          setStaffName(qrUser.staff_name || "");
        }
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching current user:", err);
      setLoading(false);
    }
  };

  // Helper function to update render state and current page
  const handleRenderChange = (pageName) => {
    setRender(pageName);
    setCurrentPage(pageName);
  };

  const archiveExpiredProducts = async () => {
    // ... existing code ...
  };

  const archiveZeroStockProducts = async () => {
    // ... existing code ...
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8f9fa",
        }}
      >
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <Container fluid className="p-0">
      <Row className="w-100 m-0">
        <Col lg={2} style={{ borderRight: "1px solid #ccc" }}>
          {/* Pass currentPage to Sidebar */}
          <Sidebar 
            setRender={handleRenderChange}  // Use the updated handler
            staffRole={staffRole} 
            currentPage={currentPage} 
          />
        </Col>
        <Col lg={10} className="p-0" style={{ backgroundColor: "#f2f2f2ff" }}>
          <Header />
          
          {/* Update all setRender calls to handleRenderChange */}

          {/* Admin Links */}
          {render === "AdminDashboard" && <AdminDashboard />}
          {render === "Inventory" && <Inventory staffRole={staffRole} />}
          {render === "ManageStaff" && (
            <ManageStaff setStaffId={setStaffId} setRender={handleRenderChange} />
          )}
          {render === "StaffInfo" && (
            <StaffInfo staffId={staffId} setRender={handleRenderChange} />
          )}
          {render === "Logs" && <Logs />}
          {render === "Reports" && <DTR />}
          {render === "MainInventory" && (
            <MainInventory staffRole={staffRole} />
          )}

          {/* Staff Links */}
          {render === "StaffDashboard" && (
            <StaffDashboard setScannedId={setScannedId} setRender={handleRenderChange} />
          )}
          {render === "Retrieval" && <StaffRetrieval setRender={handleRenderChange} />}
          {render === "Restock" && (
            <StaffRestock scannedId={scannedId} setRender={handleRenderChange} />
          )}
          {render === "Unstock" && (
            <StaffUnstock scannedId={scannedId} setRender={handleRenderChange} />
          )}
          {render === "POS" && <POS />}

          {/* Secretary Links */}
          {render === "PharmacySecretary" && (
            <PharmacySecretary
              staffId={staffId}
              staffName={staffName}
              setRender={handleRenderChange}
            />
          )}

          {/* All Users */}
          {render === "Archive" && <Archive />}
          {render === "MainArchive" && <MainArchive />}
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;