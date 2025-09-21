import { Container } from "react-bootstrap";
import { useEffect, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { supabase } from "../supabaseClient";

const BestSellingToday = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBestSellingToday();
  }, []);

  const fetchBestSellingToday = async () => {
    try {
      setLoading(true);

      // ✅ Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // ✅ Fetch today's completed transactions with items
      let { data, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          status,
          created_at,
          transaction_items (
            product_code,
            qty
          )
        `
        )
        .eq("status", "completed")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay);

      if (error) throw error;

      // ✅ Count sales per product
      const salesCount = {};
      data.forEach((t) =>
        t.transaction_items?.forEach((item) => {
          const qty = item.qty || 1;
          salesCount[item.product_code] =
            (salesCount[item.product_code] || 0) + qty;
        })
      );

      // ✅ Fetch product names
      const { data: products } = await supabase
        .from("products")
        .select("product_ID, product_name");

      const productMap = {};
      products?.forEach((p) => {
        productMap[p.product_ID] = p.product_name;
      });

      // ✅ Format + sort descending (best sellers first)
      const formatted = Object.entries(salesCount)
        .map(([product_code, totalQty]) => ({
          product_name: productMap[product_code] || product_code,
          totalQty,
        }))
        .sort((a, b) => b.totalQty - a.totalQty);

      setRows(formatted.slice(0, 3));
    } catch (err) {
      console.error("Error fetching best sellers today:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="bg-white m-4 rounded p-0">
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="mx-1 mt-3 d-inline-block">Best Selling Today</span>
      </div>
      <div>
        <TableContainer component={Paper} className="my-3">
          <Table sx={{ width: "100%" }} aria-label="best selling today table">
            <TableHead>
              <TableRow>
                <TableCell align="left">Name</TableCell>
                <TableCell align="left">Sold Quantity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    No sales today
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.product_name}</TableCell>
                    <TableCell>{row.totalQty}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </Container>
  );
};

export default BestSellingToday;
