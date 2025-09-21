// Order.jsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  TextField,
  IconButton,
} from "@mui/material";
import { Container } from "react-bootstrap";
import { RiDeleteBackLine } from "react-icons/ri";

const Order = ({ orders, onQtyChange, onDelete }) => {
  const total = orders.reduce((sum, o) => sum + o.qty * o.price, 0);

  return (
    <Container className="bg-white mx-2 my-2 rounded p-0" fluid>
      <TableContainer component={Paper} style={{ maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ "& th": { py: 0.5, fontSize: "0.85rem" } }}>
              <TableCell style={{ fontWeight: "bold" }}>Order</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell> {/* new col for delete */}
            </TableRow>
            <TableRow sx={{ "& th": { py: 0.5, fontSize: "0.8rem" } }}>
              <TableCell>Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Total</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {orders.map((order, idx) => (
              <TableRow
                key={idx}
                sx={{
                  "& td": { py: 0.3, fontSize: "0.8rem" },
                  "&:hover .delete-btn": { opacity: 1 }, // 👈 show delete on hover
                }}
              >
                <TableCell>{order.product_ID}</TableCell>
                <TableCell>{order.name}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={order.qty}
                    onChange={(e) => onQtyChange(idx, e.target.value)}
                    inputProps={{
                      min: 0,
                      style: { width: "55px", padding: "2px 6px" },
                    }}
                  />
                </TableCell>
                <TableCell>₱{order.price.toFixed(2)}</TableCell>
                <TableCell>₱{(order.qty * order.price).toFixed(2)}</TableCell>
                <TableCell align="center" width={40}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(idx)}
                    className="delete-btn"
                    sx={{ opacity: 0, transition: "opacity 0.2s" }}
                  >
                    <RiDeleteBackLine fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            {/* Footer Row */}
            <TableRow sx={{ "& td": { py: 0.5, fontSize: "0.85rem" } }}>
              <TableCell colSpan={5} style={{ textAlign: "right", fontWeight: "bold" }}>
                Total
              </TableCell>
              <TableCell style={{ fontWeight: "bold" }}>₱{total.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default Order;
