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

const ReleasedStocks = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReleasedStocks();
  }, []);

  const fetchReleasedStocks = async () => {
    try {
      setLoading(true);

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // Fetch only today's Unstock actions
      let { data, error } = await supabase
        .from("logs")
        .select("product_name, product_quantity, created_at")
        .eq("product_action", "Unstock")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRows(data || []);
    } catch (err) {
      console.error("Error fetching released stocks:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="bg-white m-4 rounded p-0">
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="mx-1 mt-3 d-inline-block">Unstocked Today</span>
        <a className="mt-3 mx-2" href="#">
          See All
        </a>
      </div>
      <div>
        <TableContainer component={Paper} className="my-3">
          <Table sx={{ width: "100%" }} aria-label="released stock table">
            <TableHead>
              <TableRow>
                <TableCell align="left">Name</TableCell>
                <TableCell align="left">Unstocked Quantity</TableCell>
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
                    No released stocks today
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => (
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

export default ReleasedStocks;
