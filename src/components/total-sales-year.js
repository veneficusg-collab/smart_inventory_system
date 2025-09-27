import { useEffect, useState, useMemo } from "react";
import { Container, Spinner } from "react-bootstrap";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CiCalendar } from "react-icons/ci";
import { FaChartLine } from "react-icons/fa"; // 👈 sales logo icon
import { supabase } from "../supabaseClient";

const TotalSalesPerYear = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(true);

  // 🔹 Year menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleYearSelect = (y) => {
    setYear(y);
    handleMenuClose();
  };

  // Pick last 10 years
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => now - i);
  }, []);

  useEffect(() => {
    fetchTotalSales(year);
  }, [year]);

  const fetchTotalSales = async (selectedYear) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          id, created_at, status,
          transaction_items ( product_code, qty, price )
        `
        )
        .eq("status", "completed")
        .gte("created_at", `${selectedYear}-01-01`)
        .lt("created_at", `${selectedYear + 1}-01-01`);

      if (error) throw error;

      let total = 0;
      data.forEach((t) => {
        t.transaction_items?.forEach((item) => {
          total += Number(item.price ?? 0) * Number(item.qty ?? 0);
        });
      });

      setTotalSales(total);
    } catch (err) {
      console.error("Error fetching total sales:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="bg-white rounded p-3 m-4 shadow-sm">
      <div className="d-flex justify-content-between align-items-center">
        {/* Title with Icon */}
        <div className="d-flex align-items-center gap-2">
          <FaChartLine size={24} className="text-success me-3" /> {/* 👈 Sales Icon */}
          <h6 className="mb-0">Total Sales</h6>
        </div>

        {/* Year picker */}
        <Button
          variant="outlined"
          startIcon={<CiCalendar />}
          onClick={handleMenuOpen}
          sx={{
            borderColor: "#6c757d !important",
            color: "#6c757d",
            "&:hover": { borderColor: "#495057 !important", color: "#495057" },
          }}
          size="small"
        >
          {year}
        </Button>
        <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
          {yearOptions.map((y) => (
            <MenuItem
              key={y}
              selected={y === year}
              onClick={() => handleYearSelect(y)}
            >
              {y}
            </MenuItem>
          ))}
        </Menu>
      </div>

      {loading ? (
        <Spinner animation="border" size="sm" className="mt-3" />
      ) : (
        <h4 className="fw-bold text-success mt-3">
          ₱{totalSales.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </h4>
      )}
    </Container>
  );
};

export default TotalSalesPerYear;
