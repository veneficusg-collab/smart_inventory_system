import { Button, Container } from "react-bootstrap";
import * as React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TablePagination from "@mui/material/TablePagination";

const ProductTable = () => {
  function createData(name, price, quantity, expiry, availability) {
    return { name, price, quantity, expiry, availability };
  }

  const rows = [
    createData("Pedigree", 200, 12, "11/11/11", "In-Stock"),
    createData("Happy Pet", 200, 15, "11/11/11", "Out-of-stock"),
    createData("Special Dog", 200, 17, "11/11/11", "Low Stock"),
    createData("Special Dog", 200, 17, "11/11/11", "In-Stock"),
    createData("Special Dog", 200, 17, "11/11/11", "Out-of-stock"),
    createData("Special Dog", 200, 17, "11/11/11", "In-Stock"),
    createData("Special Dog", 200, 17, "11/11/11", "Out-of-stock"),
    createData("Special Dog", 200, 17, "11/11/11", "In-Stock"),
    createData("Special Dog", 200, 17, "11/11/11", "Out-of-stock"),
  ];

  // State for pagination
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(7);

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Container
      className="bg-white mx-4 my-2 rounded p-0"
      fluid
      style={{ width: "140vh" }}
    >
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="mx-1 mt-3 d-inline-block">Released Stock Today</span>
        <div className="d-flex gap-2 ms-auto">
          <Button className="mx-1 mt-3" size="sm">
            Add Product
          </Button>
          <Button className="mx-1 mt-3" size="sm">
            Restore Product
          </Button>
          <Button className="mx-1 mt-3" size="sm">
            Archive Product
          </Button>
        </div>
      </div>

      <div>
        <TableContainer
          component={Paper}
          className="my-3"
          sx={{ maxHeight: 500 }} // fixed container height
        >
          <Table stickyHeader sx={{ width: "100%" }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell align="left">Product</TableCell>
                <TableCell align="left">Buying Price</TableCell>
                <TableCell align="left">Quantity</TableCell>
                <TableCell align="left">Expiry Date</TableCell>
                <TableCell align="left">Availability</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <TableRow
                    key={index}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {row.name}
                    </TableCell>
                    <TableCell align="left">{row.price}</TableCell>
                    <TableCell align="left">{row.quantity}</TableCell>
                    <TableCell align="left">{row.expiry}</TableCell>
                    <TableCell
                      align="left"
                      sx={{
                        color:
                          row.availability === "In-Stock"
                            ? "green"
                            : row.availability === "Low Stock"
                            ? "orange"
                            : "red",
                        fontWeight: "bold",
                      }}
                    >
                      {row.availability}
                    </TableCell>
                  </TableRow>
                ))}

              {/* Empty rows filler to maintain height */}
              {rows.length < (page + 1) * rowsPerPage &&
                Array.from(
                  Array(
                    rowsPerPage -
                      Math.min(rowsPerPage, rows.length - page * rowsPerPage)
                  )
                ).map((_, i) => (
                  <TableRow key={`empty-${i}`} style={{ height: 53 }}>
                    <TableCell colSpan={4} />
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Control */}
        <TablePagination
          rowsPerPageOptions={[7]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </div>
    </Container>
  );
};

export default ProductTable;
