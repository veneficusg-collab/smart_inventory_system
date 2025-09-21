import { useEffect, useState } from "react";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { Container, Table, Spinner } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const TopSellingProducts = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);

    // ✅ Fetch completed transactions in last 30 days
    const { data, error } = await supabase
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
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      );

    if (error) {
      console.error("Error fetching sales:", error);
      setLoading(false);
      return;
    }

    // ✅ Count sales per product
    const salesCount = {};
    data.forEach((t) =>
      t.transaction_items?.forEach((item) => {
        const qty = item.qty || 1;
        salesCount[item.product_code] =
          (salesCount[item.product_code] || 0) + qty;
      })
    );

    // ✅ Fetch product names for mapping
    const { data: products } = await supabase
      .from("products")
      .select("product_ID, product_name");

    const productMap = {};
    products?.forEach((p) => {
      productMap[p.product_ID] = p.product_name;
    });

    // ✅ Format and sort
    const formatted = Object.entries(salesCount)
      .map(([product_code, totalQty]) => ({
        product_name: productMap[product_code] || product_code, // fallback
        totalQty,
      }))
      .sort((a, b) => b.totalQty - a.totalQty);

    setSales(formatted);
    setLoading(false);
  };

  return (
    <Container className="bg-white mx-2 my-3 rounded p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="m-2" style={{ fontWeight: "bold" }}>
          Top Selling Products (Last 30 Days)
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <div style={{ maxHeight: "150px", overflowY: "auto" }}>
          <Table className="mx-2" style={{ width: "95%" }}>
            <TableHead>
              <TableRow>
                <TableCell
                  align="left"
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "white",
                    zIndex: 1,
                    fontWeight: "bold",
                  }}
                >
                  Product
                </TableCell>
                <TableCell
                  align="left"
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "white",
                    zIndex: 1,
                    fontWeight: "bold",
                  }}
                >
                  Quantity Sold
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    No sales data
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell align="left" style={{ fontWeight: "lighter" }}>
                      {row.product_name}
                    </TableCell>
                    <TableCell
                      align="left"
                      style={{ fontWeight: "lighter", color: "green" }}
                    >
                      {row.totalQty}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Container>
  );
};

export default TopSellingProducts;
