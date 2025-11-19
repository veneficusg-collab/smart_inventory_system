import { useEffect, useState, useMemo } from "react";
import { Container, Spinner } from "react-bootstrap";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CiCalendar } from "react-icons/ci";
import { FaChartLine } from "react-icons/fa"; // 👈 sales icon
import { supabase } from "../supabaseClient";

const MainTotalSalesPerYear = () => {
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
      // ✅ Fetch products (for product_price - selling price)
      const { data: products, error: prodError } = await supabase
        .from("main_stock_room_products")
        .select("product_ID, product_price");
      if (prodError) throw prodError;

      const productMap = {};
      products.forEach((p) => {
        productMap[p.product_ID] = {
          product_price: Number(p.product_price ?? 0),
        };
      });

      // ✅ Fetch admin_confirmed retrievals for the selected year
      const { data: retrievals, error: retrievalError } = await supabase
        .from("main_retrievals")
        .select("id, created_at, items, status")
        .eq("status", "admin_confirmed")
        .gte("created_at", `${selectedYear}-01-01`)
        .lt("created_at", `${selectedYear + 1}-01-01`);

      if (retrievalError) throw retrievalError;

      // ✅ Compute total sales
      let total = 0;
      retrievals.forEach((retrieval) => {
        // Parse items JSON string if needed
        let items = retrieval.items;
        if (typeof items === "string") {
          try {
            items = JSON.parse(items);
          } catch (e) {
            console.error("Failed to parse items:", e);
            return;
          }
        }

        // Items should be an array
        if (!Array.isArray(items)) return;

        items.forEach((item) => {
          const productId = item.product_id;
          const prod = productMap[productId];
          if (!prod) return;

          const sellPrice = Number(prod.product_price ?? 0);
          const qty = Number(item.qty ?? 0);

          total += sellPrice * qty;
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
          <FaChartLine size={24} className="text-success me-2" />{" "}
          {/* 👈 Sales Icon */}
          <h6 className="mb-0">Main Total Sales</h6>
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

export default MainTotalSalesPerYear;