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

const AddedStocks = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAddedStocks();
  }, []);

  const fetchAddedStocks = async () => {
    try {
      setLoading(true);

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // Fetch only today's Restock actions
      let { data, error } = await supabase
        .from("logs")
        .select("product_name, product_quantity, created_at")
        .eq("product_action", "Restock")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRows(data || []);
    } catch (err) {
      console.error("Error fetching added stocks:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="bg-white m-4 rounded p-0">
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="mx-1 mt-3 d-inline-block">Restocked Today</span>
        <a className="mt-3 mx-2" href="#">
          See All
        </a>
      </div>
      <div>
        <TableContainer component={Paper} className="my-3">
          <Table sx={{ width: "100%" }} aria-label="restocked table">
            <TableHead>
              <TableRow>
                <TableCell align="left">Name</TableCell>
                <TableCell align="left">Restocked Quantity</TableCell>
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
                    No restocks today
                  </TableCell>
                </TableRow>
              ) : (
                rows.slice(0, 3).map((row, idx) => ( // ✅ only show 3 rows
                  <TableRow key={idx}>
                    <TableCell>{row.product_name}</TableCell>
                    <TableCell>{row.product_quantity}</TableCell>
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

export default AddedStocks;
