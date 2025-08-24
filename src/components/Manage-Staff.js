import { useState } from "react";
import { Button, Container } from "react-bootstrap";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";
import TablePagination from "@mui/material/TablePagination";
import Box from "@mui/material/Box";
import AddStaff from "./add-staff";


const ManageStaff = () => {
  // Sample staff data - replace with your actual data
  const staffData = [
    { id: 1, name: "Juan Dela Cruz", position: "admin", contact: "091234567890", email: "juandelacruz@gmail.com" },
    { id: 2, name: "Maria Santos", position: "staff", contact: "091234567891", email: "mariasantos@gmail.com" },
    { id: 3, name: "Pedro Reyes", position: "manager", contact: "091234567892", email: "pedroreyes@gmail.com" },
    { id: 4, name: "Ana Garcia", position: "staff", contact: "091234567893", email: "anagarcia@gmail.com" },
    { id: 5, name: "Jose Fernandez", position: "admin", contact: "091234567894", email: "josefernandez@gmail.com" },
    { id: 6, name: "Carmen Lopez", position: "staff", contact: "091234567895", email: "carmenlopez@gmail.com" },
    { id: 7, name: "Miguel Torres", position: "manager", contact: "091234567896", email: "migueltorres@gmail.com" },
    { id: 8, name: "Sofia Morales", position: "staff", contact: "091234567897", email: "sofiamorales@gmail.com" },
    { id: 9, name: "Ricardo Valdez", position: "admin", contact: "091234567898", email: "ricardovaldez@gmail.com" },
    { id: 10, name: "Elena Jimenez", position: "staff", contact: "091234567899", email: "elenajimenez@gmail.com" },
    { id: 11, name: "Carlos Mendoza", position: "manager", contact: "091234567800", email: "carlosmendoza@gmail.com" },
    { id: 12, name: "Isabella Rivera", position: "staff", contact: "091234567801", email: "isabellarivera@gmail.com" },
    { id: 13, name: "Diego Herrera", position: "admin", contact: "091234567802", email: "diegoherrera@gmail.com" },
    { id: 14, name: "Lucia Castillo", position: "staff", contact: "091234567803", email: "luciacastillo@gmail.com" },
    { id: 15, name: "Fernando Ruiz", position: "manager", contact: "091234567804", email: "fernandoruiz@gmail.com" }
  ];

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal state
  const [modalShow, setModalShow] = useState(false);

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calculate displayed rows
  const displayedRows = staffData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Container 
      className="bg-white m-3 rounded p-0" 
      style={{ width: "142vh", height: "81vh", display: "flex", flexDirection: "column" }}
    >
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="m-2" style={{ fontWeight: "bold" }}>
          Staff and Admins
        </span>
        <Button size="sm" className="m-3" onClick={() => setModalShow(true)}> Add New Staff </Button>
      </div>

        <AddStaff show={modalShow} onHide={() =>setModalShow(false)} />


      {/* Table container with flex-grow */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', margin: '0 8px' }}>
        <Table style={{ width: "100%" }}>
          <TableHead>
            <TableRow>
              <TableCell align="left">Staff Name</TableCell>
              <TableCell align="left">Position</TableCell>
              <TableCell align="left">Contact #</TableCell>
              <TableCell align="left">Email</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedRows.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell align="left" style={{ fontWeight: "lighter" }}>
                  {staff.name}
                </TableCell>
                <TableCell align="left" style={{ fontWeight: "lighter" }}>
                  {staff.position}
                </TableCell>
                <TableCell align="left" style={{ fontWeight: "lighter" }}>
                  {staff.contact}
                </TableCell>
                <TableCell align="left" style={{ fontWeight: "lighter" }}>
                  {staff.email}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Material-UI Pagination Component */}
      <TablePagination
        component="div"
        count={staffData.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[11]}
        sx={{
          borderTop: '1px solid #e0e0e0',
          marginTop: 'auto'
        }}
      />
    </Container>
  );
};

export default ManageStaff;