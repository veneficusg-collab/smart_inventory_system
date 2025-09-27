import { useEffect, useState, useMemo } from "react";
import { Container, Spinner } from "react-bootstrap";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CiCalendar } from "react-icons/ci";
import { FaMoneyBillWave } from "react-icons/fa"; // 👈 profit logo icon
import { supabase } from "../supabaseClient";

const TotalProfitPerYear = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalProfit, setTotalProfit] = useState(0);
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
    fetchTotalProfit(year);
  }, [year]);

  const fetchTotalProfit = async (selectedYear) => {
    setLoading(true);
    try {
      // ✅ Fetch products (for supplier_price)
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("product_ID, supplier_price, product_price");
      if (prodError) throw prodError;

      const productMap = {};
      products.forEach((p) => {
        productMap[p.product_ID] = {
          supplier_price: Number(p.supplier_price ?? 0),
          product_price: Number(p.product_price ?? 0),
        };
      });

      // ✅ Fetch transactions for the selected year
      const { data: transactions, error: transError } = await supabase
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

      if (transError) throw transError;

      // ✅ Compute profit
      let total = 0;
      transactions.forEach((t) => {
        t.transaction_items?.forEach((item) => {
          const pid = item.product_code;
          const prod = productMap[pid];
          if (!prod) return;

          const sellPrice = Number(item.price ?? prod.product_price ?? 0);
          const supplierPrice = Number(prod.supplier_price ?? 0);
          const qty = Number(item.qty ?? 0);

          total += (sellPrice - supplierPrice) * qty;
        });
      });

      setTotalProfit(total);
    } catch (err) {
      console.error("Error fetching total profit:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="bg-white rounded p-3 m-4 shadow-sm">
      <div className="d-flex justify-content-between align-items-center">
        {/* Title with Icon */}
        <div className="d-flex align-items-center gap-2">
          <FaMoneyBillWave size={24} className="text-primary me-2" />{" "}
          {/* 👈 Profit Icon */}
          <h6 className="mb-0">Total Profit</h6>
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
        <h4 className="fw-bold text-primary mt-3">
          ₱{totalProfit.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </h4>
      )}
    </Container>
  );
};

export default TotalProfitPerYear;
