import { Container } from "react-bootstrap";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";


const LogComponent = () => {
  return (
    <Container className="bg-white mx-2 my-3 rounded p-0">
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="m-2" style={{ fontWeight: "bold" }}>
          Top-Selling Products
        </span>
        <a className="m-2" style={{ fontWeight: "lighter", fontSize: "12px" }}>
          See All
        </a>
      </div>
      <Table className="mx-2" style={{ width: "95%" }}>
        <TableHead>
          <TableRow>
            <TableCell align="left">Category</TableCell>
            <TableCell align="left">Times used</TableCell>
            <TableCell align="left">Released quantity</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell align="left" style={{ fontWeight: "lighter" }}>
              Vegetable
            </TableCell>
            <TableCell align="left" style={{ fontWeight: "lighter" }}>
              50{" "}
            </TableCell>
            <TableCell
              align="left"
              style={{ fontWeight: "lighter", color: "green" }}
            >
              1{" "}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell align="left" style={{ fontWeight: "lighter" }}>
              Instant Food
            </TableCell>
            <TableCell align="left" style={{ fontWeight: "lighter" }}>
              50{" "}
            </TableCell>
            <TableCell
              align="left"
              style={{ fontWeight: "lighter", color: "green" }}
            >
              1{" "}
            </TableCell>
          </TableRow>
          <TableRow className="">
            <TableCell align="left" style={{ fontWeight: "lighter" }}>
              Households
            </TableCell>
            <TableCell align="left" style={{ fontWeight: "lighter" }}>
              50{" "}
            </TableCell>
            <TableCell
              align="left"
              style={{ fontWeight: "lighter", color: "green" }}
            >
              1{" "}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Container>
  );
};

export default LogComponent;
