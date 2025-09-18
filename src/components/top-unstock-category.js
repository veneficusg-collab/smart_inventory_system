import { useEffect, useState } from "react";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { Container, Table, Spinner } from "react-bootstrap";
import { supabase } from "../supabaseClient"; // adjust path if needed

const TopUnstockCategories = () => {
  const [unstocks, setUnstocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnstocks();
  }, []);

  const fetchUnstocks = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("logs")
      .select("product_category, product_quantity, created_at, product_action")
      .eq("product_action", "Unstock") // ✅ only Unstock actions
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // last 30 days

    if (error) {
      console.error("Error fetching unstock logs:", error);
      setLoading(false);
      return;
    }

    // ✅ Aggregate by product_category
    const grouped = data.reduce((acc, item) => {
      const category = item.product_category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = { times: 0, totalQty: 0 };
      }
      acc[category].times += 1;
      acc[category].totalQty += item.product_quantity;
      return acc;
    }, {});

    const formatted = Object.entries(grouped)
      .map(([category, values]) => ({
        category,
        times: values.times,
        totalQty: values.totalQty,
      }))
      .sort((a, b) => b.totalQty - a.totalQty);

    setUnstocks(formatted);
    setLoading(false);
  };

  return (
    <Container className="bg-white mx-2 my-3 rounded p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="m-2" style={{ fontWeight: "bold" }}>
          Top Unstocked Categories
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
                  Category
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
                  Times Unstocked
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
                  Quantity Unstocked
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {unstocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No unstock data
                  </TableCell>
                </TableRow>
              ) : (
                unstocks.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell align="left" style={{ fontWeight: "lighter" }}>
                      {row.category}
                    </TableCell>
                    <TableCell align="left" style={{ fontWeight: "lighter" }}>
                      {row.times}
                    </TableCell>
                    <TableCell
                      align="left"
                      style={{ fontWeight: "lighter", color: "red" }}
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

export default TopUnstockCategories;
