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
import { ClipboardClock } from "lucide-react";
import { supabase } from "../supabaseClient";
import { HiArchiveBoxXMark } from "react-icons/hi2";
import { FaCalendarTimes } from "react-icons/fa";
import { FaTruckLoading } from "react-icons/fa";
import { MdOutlineInventory2 } from "react-icons/md";
import { IoTrashBinOutline } from "react-icons/io5";
import { MdLocalPharmacy } from "react-icons/md";

const Sidebar = ({ setRender, staffRole, currentPage }) => {  // Added currentPage prop
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      localStorage.removeItem("user");
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err.message);
    }
  };

  // Function to check if a link is active
  const isActive = (pageName) => {
    return currentPage === pageName;
  };

  // Active link styles
  const activeStyles = {
    backgroundColor: "#e3f2fd",
    borderLeft: "4px solid #1976d2",
    color: "#1976d2",
    fontWeight: "600",
    borderRadius: "4px",
    padding: "8px 12px",
    marginLeft: "-12px",
  };

  // Inactive link styles
  const inactiveStyles = {
    padding: "8px 12px",
    marginLeft: "-12px",
    borderRadius: "4px",
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
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: "16.9997%",
        borderRight: "1px solid #ccc",
        backgroundColor: "white",
        zIndex: 1000,
        overflowY: "auto",
        "@media (maxWidth: 768px)": {
          width: "250px",
        },
      }}
      className="sidebar-container"
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
                sx={isActive("AdminDashboard") ? activeStyles : inactiveStyles}
              >
                <div className="d-flex align-items-center my-1">
                  <CiHome />
                  <span className="mx-3">Dashboard</span>
                </div>
              </Link>

              <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("Inventory")}
                sx={isActive("Inventory") ? activeStyles : inactiveStyles}
              >
                <div className="d-flex align-items-center my-1">
                  <MdLocalPharmacy />
                  <span className="mx-3">Pharmacy Inventory</span>
                </div>
              </Link>

              <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("MainInventory")}
                sx={isActive("MainInventory") ? activeStyles : inactiveStyles}
              >
                <div className="d-flex align-items-center my-1">
                  <FaTruckLoading style={{ width: "16px" }} />
                  <span className="mx-3">Main Inventory</span>
                </div>
              </Link>

              <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("ManageStaff")}
                sx={isActive("ManageStaff") ? activeStyles : inactiveStyles}
              >
                <div className="d-flex align-items-center my-1">
                  <MdManageAccounts />
                  <span className="mx-3">Manage Personnel</span>
                </div>
              </Link>

              <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("Logs")}
                sx={isActive("Logs") ? activeStyles : inactiveStyles}
              >
                <div className="d-flex align-items-center my-1">
                  <ClipboardClock style={{ width: "16px" }} />
                  <span className="mx-3">Logs</span>
                </div>
              </Link>

              <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("Archive")}
                sx={isActive("Archive") ? activeStyles : inactiveStyles}
              >
                <div className="d-flex align-items-center my-1">
                  <HiArchiveBoxXMark style={{ width: "16px" }} />
                  <span className="mx-3">Archive</span>
                </div>
              </Link>

              <Link
                underline="hover"
                color="inherit"
                component="button"
                onClick={() => setRender("Reports")}
                sx={isActive("Reports") ? activeStyles : inactiveStyles}
              >
                <div className="d-flex align-items-center my-1">
                  <IoIosStats />
                  <span className="mx-3">Reports</span>
                </div>
              </Link>
            </>
          ) : staffRole === "secretary" ? (
            <>
              <div className="d-flex flex-column" style={{ marginLeft: "10px" }}>
                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => setRender("POS")}
                  sx={isActive("POS") ? activeStyles : inactiveStyles}
                >
                  <div className="d-flex align-items-center my-1">
                    <RiProductHuntFill style={{ width: "16px" }} />
                    <span className="mx-3">POS</span>
                  </div>
                </Link>
                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => setRender("PharmacySecretary")}
                  sx={isActive("PharmacySecretary") ? activeStyles : inactiveStyles}
                >
                  <div className="d-flex align-items-center my-1">
                    <FaCalendarTimes style={{ width: "16px" }} />
                    <span className="mx-3">Retrieval</span>
                  </div>
                </Link>
                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => setRender("StaffDashboard")}
                  sx={isActive("StaffDashboard") ? activeStyles : inactiveStyles}
                >
                  <div className="d-flex align-items-center my-1">
                    <AiFillProduct style={{ width: "16px" }} />
                    <span className="mx-3">Stocking</span>
                  </div>
                </Link>

                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => setRender("Inventory")}
                  sx={isActive("Inventory") ? activeStyles : inactiveStyles}
                >
                  <div className="d-flex align-items-center my-1">
                    <MdInventory2 />
                    <span className="mx-3">Pharmacy</span>
                  </div>
                </Link>

                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => setRender("Logs")}
                  sx={isActive("Logs") ? activeStyles : inactiveStyles}
                >
                  <div className="d-flex align-items-center my-1">
                    <ClipboardClock style={{ width: "16px" }} />
                    <span className="mx-3">Logs</span>
                  </div>
                </Link>

                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => setRender("Archive")}
                  sx={isActive("Archive") ? activeStyles : inactiveStyles}
                >
                  <div className="d-flex align-items-center my-1">
                    <HiArchiveBoxXMark style={{ width: "16px" }} />
                    <span className="mx-3">Archive</span>
                  </div>
                </Link>

                <Link
                  underline="hover"
                  color="inherit"
                  component="button"
                  onClick={() => setRender("MainInventory")}
                  sx={isActive("MainInventory") ? activeStyles : inactiveStyles}
                >
                  <div className="d-flex align-items-center my-1">
                    <MdOutlineInventory2 style={{ width: "16px" }} />
                    <span className="mx-3">Main Inventory</span>
                  </div>
                </Link>
              </div>
            </>
          ) : (
            // Staff role links (if any)
            <>
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
          sx={inactiveStyles}
        >
          <div className="d-flex align-items-center my-1 text-danger">
            <CiLogout />
            <span className="mx-3">Logout</span>
          </div>
        </Link>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .sidebar-container {
            width: 250px !important;
          }
        }
        
        @media (max-height: 600px) {
          .sidebar-container {
            overflow-y: auto !important;
          }
        }
      `}</style>
    </Container>
  );
};

export default Sidebar;