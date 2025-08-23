import { Container, Image } from "react-bootstrap";
import logo from "../logo.png";
import { CiHome } from "react-icons/ci";
import { MdInventory2 } from "react-icons/md";
import { IoIosStats } from "react-icons/io";
import { MdManageAccounts } from "react-icons/md";
import { FiSettings } from "react-icons/fi";
import { CiLogout } from "react-icons/ci";

const Sidebar = () => {
  return (
    <Container
      fluid
      style={{
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "100vh",
    padding: "20px",
    position: "fixed",     // ✅ makes it fixed
    top: 0,
    left: 0,
    bottom: 0,
    width: "16.6667%",     // ✅ 2/12 columns = ~16.67%
    borderRight: "1px solid #ccc",
    backgroundColor: "white", // ✅ keep background solid
    zIndex: 1000
  }}
    >
      {/* Top section */}
      <div>
        <div className="text-center">
          <Image src={logo} style={{ width: "100px" }} className="my-5" />
        </div>

        <div
          className="text-start"
          style={{ fontWeight: "300", marginLeft: "10px" }}
        >
          <div className="d-flex align-items-center my-3">
            <CiHome />
            <span className="mx-3">Dashboard</span>
          </div>
          <div className="d-flex align-items-center my-3">
            <MdInventory2 />
            <span className="mx-3">Inventory</span>
          </div>
          <div className="d-flex align-items-center my-3">
            <IoIosStats />
            <span className="mx-3">Reports</span>
          </div>
          <div className="d-flex align-items-center my-3">
            <MdManageAccounts />
            <span className="mx-3">Manage Staff</span>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="text-start" style={{ fontWeight: "300", marginLeft: "10px" }}>
        <div className="d-flex align-items-center my-3">
          <FiSettings />
          <span className="mx-3">Settings</span>
        </div>
        <div className="d-flex align-items-center my-3">
          <CiLogout />
          <span className="mx-3">Logout</span>
        </div>
      </div>
    </Container>
  );
};

export default Sidebar;
