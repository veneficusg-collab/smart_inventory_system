import { useEffect, useState } from "react";
import { Button, Container } from "react-bootstrap";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";
import Box from "@mui/material/Box";
import AddStaff from "./add-staff";
import { supabase } from "../supabaseClient";

const ManageStaff = ({ setStaffId, setRender }) => {
  // Data state
  const [staffData, setStaffData] = useState([]);
  const [currentUser, setCurrentUser] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  // Modal state
  const [modalShow, setModalShow] = useState(false);

  const handleRowClicked = (staffID) => {
    setStaffId(staffID);
    setRender("StaffInfo");
  };

  // Fetch all staff
  const fetchStaffData = async () => {
    const { data, error } = await supabase.from("staff").select("*");
    if (error) {
      console.error("Error fetching staff:", error.message);
    } else {
      setStaffData(data);
    }
  };

  // Fetch current user’s position
  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: staff, error } = await supabase
      .from("staff")
      .select("staff_position")
      .eq("id", user.id)
      .single(); // expect only one

    if (error) {
      console.error("Error fetching current user:", error.message);
    } else {
      setCurrentUser(staff?.staff_position || "");
      setCurrentUserId(staff?.id || "");
    }
  };

  // Delete staff handler
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) {
      return;
    }

    const { error } = await supabase.from("staff").delete().eq("id", id);

    if (error) {
      console.error("Error deleting staff:", error.message);
    } else {
      // Refresh staff list after delete
      fetchStaffData();
    }
  };

  useEffect(() => {
    fetchStaffData();
    fetchCurrentUser();
  }, []);

  return (
    <Container
      className="bg-white m-3 rounded p-0"
      style={{
        width: "142vh",
        height: "79vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="m-2" style={{ fontWeight: "bold" }}>
          Staff and Admins
        </span>
        <Button size="sm" className="m-3" onClick={() => setModalShow(true)}>
          Add New Staff
        </Button>
      </div>

      <AddStaff show={modalShow} onHide={() => setModalShow(false)} />

      {/* Table container with scroll */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          overflowX: "hidden",
          margin: "0 8px",
        }}
      >
        <Table stickyHeader style={{ width: "100%" }}>
          <TableHead>
            <TableRow>
              <TableCell align="left">Staff Name</TableCell>
              <TableCell align="left">Position</TableCell>
              <TableCell align="left">Contact #</TableCell>
              <TableCell align="left">Email</TableCell>
              {(currentUser === "super_admin" || currentUser === "admin") && (
                <TableCell align="center">Actions</TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {staffData.map((staff) => {
              const canDelete =
                currentUser === "super_admin" ||
                (currentUser === "admin" && staff.staff_position === "staff");

              const isSelf = staff.id === currentUserId;

              return (
                <TableRow
                  key={staff.id}
                  onClick={() => handleRowClicked(staff.id)}
                  sx={{
                    cursor: "pointer",
                    "&:hover": { backgroundColor: "#f5f5f5" },
                  }}
                >
                  <TableCell align="left">{staff.staff_name}</TableCell>
                  <TableCell align="left">{staff.staff_position}</TableCell>
                  <TableCell align="left">{staff.staff_contact}</TableCell>
                  <TableCell align="left">{staff.staff_email}</TableCell>
                  {(currentUser === "super_admin" ||
                    currentUser === "admin") && (
                    <TableCell align="center">
                      {canDelete && !isSelf && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent row click
                            handleDelete(staff.id);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Container>
  );
};

export default ManageStaff;
