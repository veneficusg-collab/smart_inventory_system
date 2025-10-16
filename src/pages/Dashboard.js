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
import POS from "../components/POS";
import Archive from "../components/Archive";
import DTR from "../components/DTR";

const Dashboard = () => {
  const [render, setRender] = useState("AdminDashboard");
  const [staffId, setStaffId] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [scannedId, setScannedId] = useState("");

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    setDefaultRender();
  }, [staffRole]);

  // 🔹 Auto-archive expired + out-of-stock products on app load
  useEffect(() => {
    (async () => {
      await archiveExpiredProducts();
      await archiveZeroStockProducts(); // ⬅️ NEW
    })();
  }, []);

  const setDefaultRender = () => {
    if (staffRole === "staff") setRender("StaffDashboard");
    else setRender("AdminDashboard");
  };

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      let { data: staff, error } = await supabase
        .from("staff")
        .select("staff_position")
        .eq("id", user.id)
        .single();

      if (!error && staff) {
        setStaffRole(staff.staff_position);
        setStaffId(user.id);
        console.log("Supabase Role:", staff.staff_position);
      }
    } else {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const qrUser = JSON.parse(storedUser);
        setStaffRole(qrUser.staff_position);
        setStaffId(qrUser.id);
        console.log("QR Role:", qrUser.staff_position);
      }
    }
  };

  // 🔸 Move expired products to archive
  const archiveExpiredProducts = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

      // 1) Fetch expired products (ignore rows without an expiry)
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

      // 2) Prepare archive rows (map product_ID -> product_code)
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
        product_id: p.id ?? null,
      }));

      // 3) Insert into archive FIRST
      const { error: insertErr } = await supabase
        .from("archive")
        .insert(archiveRows);

      if (insertErr) {
        console.error("Archive insert failed:", insertErr);
        return; // don't delete if archiving fails
      }

      // 4) Delete archived products from products table
      const productIDs = expired.map((p) => p.product_ID);
      const { error: deleteErr } = await supabase
        .from("products")
        .delete()
        .in("product_ID", productIDs);

      if (deleteErr) {
        console.error("Delete expired products failed:", deleteErr);
      } else {
        console.log(`Archived & deleted ${productIDs.length} expired product(s).`);
      }
    } catch (e) {
      console.error("archiveExpiredProducts unexpected error:", e);
    }
  };

  // 🔸 NEW: Move zero/out-of-stock products to archive (product_quantity <= 0)
  const archiveZeroStockProducts = async () => {
    try {
      // 1) Fetch products where quantity <= 0 (nulls are ignored)
      const { data: zeroStock, error: fetchErr } = await supabase
        .from("products")
        .select("*")
        .lte("product_quantity", 0);

      if (fetchErr) {
        console.error("Fetch zero-stock products error:", fetchErr);
        return;
      }
      if (!zeroStock || zeroStock.length === 0) return;

      // 2) Prepare archive rows (same mapping)
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

      // 3) Insert into archive FIRST
      const { error: insertErr } = await supabase
        .from("archive")
        .insert(archiveRows);

      if (insertErr) {
        console.error("Archive (zero-stock) insert failed:", insertErr);
        return;
      }

      // 4) Delete from products
      const productIDs = zeroStock.map((p) => p.product_ID);
      const { error: deleteErr } = await supabase
        .from("products")
        .delete()
        .in("product_ID", productIDs);

      if (deleteErr) {
        console.error("Delete zero-stock products failed:", deleteErr);
      } else {
        console.log(`Archived & deleted ${productIDs.length} zero-stock product(s).`);
      }
    } catch (e) {
      console.error("archiveZeroStockProducts unexpected error:", e);
    }
  };

  // Admin & Staff views
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
          {render === "Reports" && <Reports />}
          {render === "ManageStaff" && (
            <ManageStaff setStaffId={setStaffId} setRender={setRender} />
          )}
          {render === "StaffInfo" && (
            <StaffInfo staffId={staffId} setRender={setRender} />
          )}
          {render === "Logs" && <Logs />}

          {render === "DTR" && <DTR />}

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

          {render === "POS" && <POS />}

          {/* All User */}
          {render === "Archive" && <Archive />}
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
