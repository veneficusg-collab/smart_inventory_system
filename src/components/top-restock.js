import { useEffect, useState } from "react";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { Container, Table, Spinner } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const TopRestockProducts = () => {
  const [restocks, setRestocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestocks();
  }, []);

  const fetchRestocks = async () => {
    setLoading(true);

    // ✅ Query logs instead of products
    const { data, error } = await supabase
      .from("logs")
      .select("product_name, product_quantity, product_action, created_at")
      .eq("product_action", "Restock") // only include restock actions
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ); // last 30 days

    if (error) {
      console.error("Error fetching restocks:", error);
      setLoading(false);
      return;
    }

    // ✅ Aggregate by product_name
    const grouped = data.reduce((acc, item) => {
      if (!acc[item.product_name]) {
        acc[item.product_name] = { times: 0, totalQty: 0 };
      }
      acc[item.product_name].times += 1;
      acc[item.product_name].totalQty += item.product_quantity || 0;
      return acc;
    }, {});

    const formatted = Object.entries(grouped)
      .map(([product_name, values]) => ({
        product_name,
        times: values.times,
        totalQty: values.totalQty,
      }))
      .sort((a, b) => b.totalQty - a.totalQty);

    setRestocks(formatted);
    setLoading(false);
  };

  return (
    <Container className="bg-white mx-2 my-3 rounded p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="m-2" style={{ fontWeight: "bold" }}>
          Top Restocked Products
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
                  Times Restocked
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
                  Quantity Restocked
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {restocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No restock data
                  </TableCell>
                </TableRow>
              ) : (
                restocks.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell align="left" style={{ fontWeight: "lighter" }}>
                      {row.product_name}
                    </TableCell>
                    <TableCell align="left" style={{ fontWeight: "lighter" }}>
                      {row.times}
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

export default TopRestockProducts;
