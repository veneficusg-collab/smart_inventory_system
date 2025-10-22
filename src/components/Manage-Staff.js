// ManageStaff.jsx
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
  const [staffData, setStaffData] = useState([]);
  const [currentUser, setCurrentUser] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [modalShow, setModalShow] = useState(false);
  const [deletingId, setDeletingId] = useState(null); // NEW

  const handleRowClicked = (staffID) => {
    setStaffId(staffID);
    setRender("StaffInfo");
  };

  const fetchStaffData = async () => {
    const { data, error } = await supabase.from("staff").select("*");
    if (!error && data) setStaffData(data);
  };

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: staff, error } = await supabase
      .from("staff")
      .select("id, staff_position")
      .eq("id", user.id)
      .single();

    if (!error && staff) {
      setCurrentUser(staff.staff_position || "");
      setCurrentUserId(staff.id || "");
    }
  };

  // UPDATED: call Edge Function to delete both auth user + staff row
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this staff member?"))
      return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      alert(
        "Please sign in with your admin email/password account to delete staff."
      );
      return;
    }

    setDeletingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("delete-staff", {
        body: { userId: id },
        // not strictly necessary, but explicit never hurts:
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.error("Edge function error:", error);
        alert(error.message || "Failed to delete staff.");
        return;
      }
      if (data?.error) {
        alert(data.error);
        return;
      }
      await fetchStaffData();
    } catch (e) {
      console.error("invoke transport error:", e);
      alert(`Edge Function request failed: ${e?.message || e}`);
    } finally {
      setDeletingId(null);
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
                          disabled={deletingId === staff.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(staff.id);
                          }}
                        >
                          {deletingId === staff.id ? "Deleting..." : "Delete"}
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
