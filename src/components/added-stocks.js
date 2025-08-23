import { Container } from "react-bootstrap";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

const AddedStocks = () => {
    function createData(name, release, remaining, price) {
    return { name, release, remaining, price};
  }

    const rows = [
    createData("Pedigree", 30, 12, 100),
    createData("Happy Pet", 21, 15, 207),
    createData("Special Dog", 19, 17, 105),
  ];
  return (
    <Container className="bg-white m-4 rounded p-0">
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="mx-1 mt-3 d-inline-block">Released Stock Today</span>
        <a className="mt-3 mx-2">See All</a>
      </div>
      <TableContainer component={Paper} className="my-3">
          <Table sx={{ width: '100%' }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell align="left">Name</TableCell>
                <TableCell align="left">Released Quantity</TableCell>
                <TableCell align="left">Remaining Quantity</TableCell>
                <TableCell align="left">Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.name}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {row.name}
                  </TableCell>
                  <TableCell align="left">{row.release}</TableCell>
                  <TableCell align="left">{row.remaining}</TableCell>
                  <TableCell align="left">{row.price}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
    </Container>
  );
};

export default AddedStocks;
