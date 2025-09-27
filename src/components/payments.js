// Payments.jsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TableFooter,
  Paper,
  TextField,
  IconButton,
} from "@mui/material";
import { Button, Container } from "react-bootstrap";
import { useState } from "react";
import { RiDeleteBackLine } from "react-icons/ri";

const Payments = ({ total, payments, setPayments }) => {
  const [discountType, setDiscountType] = useState(null); 
  // null | "PWD" | "Senior"

  // ✅ Handle adding payment row
  const handleAddPayment = (method) => {
    setPayments((prev) => {
      const existing = prev.find((p) => p.method === method);
      if (existing) return prev; // avoid duplicates
      return [...prev, { method, amount: discountedTotal }];
    });
  };

  const handleAmountChange = (idx, value) => {
    setPayments((prev) => {
      const updated = [...prev];
      updated[idx].amount = value === "" ? 0 : parseFloat(value);
      return updated;
    });
  };

  const handleDelete = (idx) => {
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  };

  // ✅ Apply 20% discount
  const discountRate = discountType ? 0.2 : 0;
  const discountAmount = total * discountRate;
  const discountedTotal = total - discountAmount;

  const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const change = paymentTotal - discountedTotal;

  // ✅ Unified button style
  const btnStyle = { padding: "2px 6px", fontSize: "0.75rem" };

  return (
    <Container className="bg-white mx-1 my-2 rounded p-0" fluid>
      <TableContainer component={Paper} style={{ maxHeight: 280, height: 280 }}>
        <Table size="small" stickyHeader stickyFooter>
          <TableHead>
            <TableRow sx={{ "& th": { py: 0.5, fontSize: "0.85rem" } }}>
              {/* Payments label */}
              <TableCell style={{ fontWeight: "bold" }}>Payments</TableCell>

              {/* Discount buttons */}
              <TableCell align="center" colSpan={2}>
                <div className="d-flex justify-content-center gap-2">
                  <Button
                    size="sm"
                    variant={discountType === "PWD" ? "success" : "outline-success"}
                    style={btnStyle}
                    onClick={() =>
                      setDiscountType(discountType === "PWD" ? null : "PWD")
                    }
                  >
                    PWD (20%)
                  </Button>
                  <Button
                    size="sm"
                    variant={discountType === "Senior" ? "success" : "outline-success"}
                    style={btnStyle}
                    onClick={() =>
                      setDiscountType(discountType === "Senior" ? null : "Senior")
                    }
                  >
                    Senior (20%)
                  </Button>
                </div>
              </TableCell>

              {/* Payment methods */}
              <TableCell colSpan={3} align="right">
                <div className="d-flex justify-content-end gap-2">
                  {["Cash", "GCash", "Debit", "Credit", "Cheque"].map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant="outline-primary"
                      style={btnStyle}
                      onClick={() => handleAddPayment(m)}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {payments.map((p, idx) => (
              <TableRow
                key={idx}
                sx={{
                  "& td": { py: 0.3, fontSize: "0.8rem" },
                  "&:hover .delete-btn": { opacity: 1 },
                }}
              >
                <TableCell>{p.method}</TableCell>
                <TableCell colSpan={4} align="right">
                  <TextField
                    type="number"
                    size="small"
                    value={p.amount}
                    onChange={(e) => handleAmountChange(idx, e.target.value)}
                    inputProps={{
                      min: 0,
                      style: {
                        width: "70px",
                        textAlign: "right",
                        padding: "2px 6px",
                      },
                    }}
                  />
                </TableCell>
                <TableCell align="center" width={40}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(idx)}
                    className="delete-btn"
                    sx={{ opacity: 0, transition: "opacity 0.2s" }}
                  >
                    <RiDeleteBackLine fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            {discountType && (
              <TableRow sx={{ "& td": { py: 0.4, fontSize: "0.8rem" } }}>
                <TableCell colSpan={6} align="right" style={{ color: "blue" }}>
                  {discountType} Discount: -₱{discountAmount.toFixed(2)}
                </TableCell>
              </TableRow>
            )}
            <TableRow
              sx={{ "& td": { py: 0.4, fontSize: "0.85rem", fontWeight: "bold" } }}
            >
              <TableCell colSpan={6} align="right">
                Payments Total: ₱{paymentTotal.toFixed(2)} / Order Total: ₱
                {discountedTotal.toFixed(2)}
              </TableCell>
            </TableRow>
            <TableRow
              sx={{ "& td": { py: 0.4, fontSize: "0.85rem", fontWeight: "bold" } }}
            >
              <TableCell
                colSpan={6}
                align="right"
                style={{ color: change < 0 ? "red" : "green" }}
              >
                Change: ₱{change >= 0 ? change.toFixed(2) : "0.00"}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default Payments;
