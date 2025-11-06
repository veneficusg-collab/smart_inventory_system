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
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import StaffUnstock from "../components/Staff-unstock";
import POS from "../components/POS";
import Archive from "../components/Archive";
import DTR from "../components/DTR";
import MainInventory from "../components/MainInventory";
import MainArchive from "../components/MainArchive";
import StaffRetrieval from "../components/StaffRetrieval";
import PharmacySecretary from "../components/PharmacySecretary";

const Dashboard = () => {
  const [render, setRender] = useState("AdminDashboard");
  const [staffId, setStaffId] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [staffName, setStaffName] = useState("");
  const [scannedId, setScannedId] = useState("");
  const [loading, setLoading] = useState(true); // ✅ Added loading state

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (staffRole) {
      setDefaultRender();
      setLoading(false); // ✅ stop loading once role is known
    }
  }, [staffRole]);

  useEffect(() => {
    (async () => {
      await archiveExpiredProducts();
      await archiveZeroStockProducts();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDefaultRender = () => {
    if (staffRole === "staff") setRender("StaffDashboard");
    else if (staffRole === "secretary") setRender("PharmacySecretary");
    else setRender("AdminDashboard");
  };

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
          console.log("Supabase Role:", staff.staff_position);
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
          console.log("QR Role:", qrUser.staff_position);
        }
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching current user:", err);
      setLoading(false);
    }
  };

  // 🔸 Archive expired products
  const archiveExpiredProducts = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);

      const { data: expired, error: fetchErr } = await supabase
        .from("products")
        .select("*")
        .not("product_expiry", "is", null)
        .lt("product_expiry", today);

      if (fetchErr) {
        console.error("Fetch expired products error:", fetchErr);
        return;
      }
      if (!expired || expired.length === 0) return;

      const archiveRows = expired.map((p) => ({
        product_name: p.product_name ?? null,
        product_code: p.product_ID ?? null,
        product_category: p.product_category ?? null,
        product_price: p.product_price ?? null,
        product_quantity: p.product_quantity ?? null,
        product_unit: p.product_unit ?? null,
        product_expiry: p.product_expiry ?? null,
        product_img: p.product_img ?? null,
        supplier_name: p.supplier_name ?? null,
        product_brand: p.product_brand ?? null,
        supplier_price: p.supplier_price ?? null,
      }));

      const { error: insertErr } = await supabase
        .from("archive")
        .insert(archiveRows);
      if (insertErr) {
        console.error("Archive insert failed:", insertErr);
        return;
      }

      const logRows = expired.map((p) => ({
        product_id: p.product_ID,
        product_name: p.product_name ?? p.product_ID,
        product_category: p.product_category ?? null,
        product_unit: p.product_unit ?? null,
        product_quantity: p.product_quantity ?? 0,
        product_expiry: p.product_expiry ?? null,
        product_action: "Auto-Archive (Expired)",
        product_uuid: p.id ?? null,
        staff: "System",
      }));
      const { error: logErr } = await supabase.from("logs").insert(logRows);
      if (logErr) console.error("Log insert (expired) failed:", logErr);

      const productIDs = expired.map((p) => p.product_ID);
      const { error: deleteErr } = await supabase
        .from("products")
        .delete()
        .in("product_ID", productIDs);

      if (deleteErr)
        console.error("Delete expired products failed:", deleteErr);
      else console.log(`Archived ${productIDs.length} expired products.`);
    } catch (e) {
      console.error("archiveExpiredProducts unexpected error:", e);
    }
  };

  // 🔸 Archive zero/out-of-stock products
  const archiveZeroStockProducts = async () => {
    try {
      const { data: zeroStock, error: fetchErr } = await supabase
        .from("products")
        .select("*")
        .lte("product_quantity", 0);

      if (fetchErr) {
        console.error("Fetch zero-stock products error:", fetchErr);
        return;
      }
      if (!zeroStock || zeroStock.length === 0) return;

      const archiveRows = zeroStock.map((p) => ({
        product_name: p.product_name ?? null,
        product_code: p.product_ID ?? null,
        product_category: p.product_category ?? null,
        product_price: p.product_price ?? null,
        product_quantity: p.product_quantity ?? null,
        product_unit: p.product_unit ?? null,
        product_expiry: p.product_expiry ?? null,
        product_img: p.product_img ?? null,
        supplier_name: p.supplier_name ?? null,
        product_brand: p.product_brand ?? null,
        supplier_price: p.supplier_price ?? null,
      }));

      const { error: insertErr } = await supabase
        .from("archive")
        .insert(archiveRows);
      if (insertErr) {
        console.error("Archive (zero-stock) insert failed:", insertErr);
        return;
      }

      const logRows = zeroStock.map((p) => ({
        product_id: p.product_ID,
        product_name: p.product_name ?? p.product_ID,
        product_category: p.product_category ?? null,
        product_unit: p.product_unit ?? null,
        product_quantity: p.product_quantity ?? 0,
        product_expiry: p.product_expiry ?? null,
        product_action: "Auto-Archive (Zero Stock)",
        product_uuid: p.id ?? null,
        staff: "System",
      }));
      const { error: logErr } = await supabase.from("logs").insert(logRows);
      if (logErr) console.error("Log insert (zero stock) failed:", logErr);

      const productIDs = zeroStock.map((p) => p.product_ID);
      const { error: deleteErr } = await supabase
        .from("products")
        .delete()
        .in("product_ID", productIDs);

      if (deleteErr)
        console.error("Delete zero-stock products failed:", deleteErr);
      else console.log(`Archived ${productIDs.length} zero-stock products.`);
    } catch (e) {
      console.error("archiveZeroStockProducts unexpected error:", e);
    }
  };

  // ✅ Loading screen to prevent dashboard preview flicker
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

  // ✅ Normal Dashboard once loading is complete
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
          {render === "Inventory" && <Inventory staffRole={staffRole} />}
          {render === "ManageStaff" && (
            <ManageStaff setStaffId={setStaffId} setRender={setRender} />
          )}
          {render === "StaffInfo" && (
            <StaffInfo staffId={staffId} setRender={setRender} />
          )}
          {render === "Logs" && <Logs />}
          {render === "Reports" && <DTR />}
          {render === "MainInventory" && (
            <MainInventory staffRole={staffRole} />
          )}

          {/* Staff Links */}
          {render === "StaffDashboard" && (
            <StaffDashboard setScannedId={setScannedId} setRender={setRender} />
          )}
          {render === "Retrieval" && (
            <StaffRetrieval
              staffId={staffId}
              staffName={staffName}
              setRender={setRender}
            />
          )}
          {render === "Restock" && (
            <StaffRestock scannedId={scannedId} setRender={setRender} />
          )}
          {render === "Unstock" && (
            <StaffUnstock scannedId={scannedId} setRender={setRender} />
          )}
          {render === "POS" && <POS />}

          {/* Secretary Links */}
          {render === "PharmacySecretary" && (<PharmacySecretary staffId={staffId} staffName={staffName} setRender={setRender} />)}

          {/* All Users */}
          {render === "Archive" && <Archive />}
          {render === "MainArchive" && <MainArchive />}
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
