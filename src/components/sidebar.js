import { Container, Image } from "react-bootstrap";
import logo from "../logo.png";
import { CiHome } from "react-icons/ci";
import { MdInventory2 } from "react-icons/md";
import { IoIosStats } from "react-icons/io";
import { MdManageAccounts } from "react-icons/md";
import { RiProductHuntFill } from "react-icons/ri";
import { AiFillProduct } from "react-icons/ai";
import { CiLogout } from "react-icons/ci";
import { Link } from "@mui/material";
import { ClipboardClock, Logs } from "lucide-react";
import { supabase } from "../supabaseClient";
import { HiArchiveBoxXMark } from "react-icons/hi2";
import { FaCalendarTimes } from "react-icons/fa";


const Sidebar = ({ setRender, staffRole }) => {
  const handleLogout = async () => {
    try {
      // 1️⃣ Supabase logout (if user logged in normally)
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 2️⃣ QR-only user session cleanup
      localStorage.removeItem("user");

      // 3️⃣ Redirect to login page
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err.message);
    }
  };

  return (
    <Container
      fluid
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "100vh",
        padding: "20px",
        position: "fixed", // ✅ makes it fixed
        top: 0,
        left: 0,
        bottom: 0,
        width: "16.6667%", // ✅ 2/12 columns = ~16.67%
        borderRight: "1px solid #ccc",
        backgroundColor: "white", // ✅ keep background solid
        zIndex: 1000,
      }}
    >
      {/* Top section */}
      <div>
        <div className="text-center">
          <Image src={logo} style={{ width: "100px" }} className="my-5" />
        </div>

        <div
          className="d-flex flex-column"
          style={{ marginLeft: "10px", gap: "12px" }}
        >
          {staffRole === "admin" || staffRole === "super_admin" ? (
            <>
              <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("AdminDashboard")}
              >
                <div className="d-flex align-items-center my-3">
                  <CiHome />
                  <span className="mx-3">Dashboard</span>
                </div>
              </Link>

              <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("Inventory")}
              >
                <div className="d-flex align-items-center my-3">
                  <MdInventory2 />
                  <span className="mx-3">Inventory</span>
                </div>
              </Link>

              <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("Reports")}
              >
                <div className="d-flex align-items-center my-3">
                  <IoIosStats />
                  <span className="mx-3">Reports</span>
                </div>
              </Link>

              <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("ManageStaff")}
              >
                <div className="d-flex align-items-center my-3">
                  <MdManageAccounts />
                  <span className="mx-3">Manage Staff</span>
                </div>
              </Link>
            

              <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("Logs")}
              >
                <div className="d-flex align-items-center my-3">
                  <ClipboardClock style={{ width: "16px" }} />
                  <span className="mx-3">Logs</span>
                </div>
              </Link>
              <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("DTR")}
              >
                <div className="d-flex align-items-center my-3">
                  <FaCalendarTimes style={{ width: "16px" }} />
                  <span className="mx-3">DTR</span>
                </div>
              </Link>
                <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("Archive")}
              >
                <div className="d-flex align-items-center my-3">
                  <HiArchiveBoxXMark style={{ width: "16px" }} />
                  <span className="mx-3">Archive</span>
                </div>
              </Link>
            

            </>
          ) : (
            // ✅ Staff role = only Logs
            <>
              {/* Middle section */}
              <div
                className="d-flex flex-column" // 🔹 makes children stack vertically
                style={{ marginLeft: "10px" }}
              >
                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => setRender("POS")}
                >
                  <div className="d-flex align-items-center my-2">
                    <RiProductHuntFill style={{ width: "16px" }} />
                    <span className="mx-3">POS</span>
                  </div>
                </Link>

                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => setRender("StaffDashboard")}
                >
                  <div className="d-flex align-items-center my-2">
                    <AiFillProduct style={{ width: "16px" }} />
                    <span className="mx-3">Stocking</span>
                  </div>
                </Link>

                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => setRender("Inventory")}
                >
                  <div className="d-flex align-items-center my-3">
                    <MdInventory2 />
                    <span className="mx-3">Inventory</span>
                  </div>
                </Link>
                

                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => setRender("Logs")}
                >
                  <div className="d-flex align-items-center my-2">
                    <ClipboardClock style={{ width: "16px" }} />
                    <span className="mx-3">Logs</span>
                  </div>
                </Link>
                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => setRender("Archive")}
                >
                  <div className="d-flex align-items-center my-3">
                    <HiArchiveBoxXMark style={{ width: "16px" }} />
                    <span className="mx-3">Archive</span>
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div
        className="d-flex flex-column"
        style={{ marginLeft: "10px", gap: "12px" }}
      >
        <Link
          underline="hover"
          color="inherit"
          component="button"
          onClick={() => handleLogout()}
          className="text-danger"
        >
          <div className="d-flex align-items-center my-3 text-danger">
            <CiLogout />
            <span className="mx-3">Logout</span>
          </div>
        </Link>
      </div>
    </Container>
  );
};

export default Sidebar;
