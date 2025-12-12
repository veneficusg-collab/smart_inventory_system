import { useEffect, useState, useMemo } from "react";
import { Container, Spinner } from "react-bootstrap";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CiCalendar } from "react-icons/ci";
import { FaFileInvoiceDollar } from "react-icons/fa";
import { supabase } from "../supabaseClient";

const TotalExpensesPerYear = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleYearSelect = (y) => {
    setYear(y);
    handleMenuClose();
  };

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => now - i);
  }, []);

  useEffect(() => {
    fetchTotalExpenses(year);
  }, [year]);

  const fetchTotalExpenses = async (selectedYear) => {
    setLoading(true);
    try {
      // Step 1: Fetch products to get supplier prices
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("product_ID, supplier_price");
      if (prodError) throw prodError;

      const productMap = {};
      products.forEach((p) => {
        productMap[p.product_ID] = Number(p.supplier_price ?? 0);
      });

      // Step 2: Fetch ALL retrievals from main_retrievals for the year
      // These represent items that have been taken out of main inventory
      const { data: retrievals, error: retrievalError } = await supabase
        .from("main_retrievals")
        .select("id, items, created_at, status")
        .gte("created_at", `${selectedYear}-01-01`)
        .lt("created_at", `${selectedYear + 1}-01-01`);

      if (retrievalError) throw retrievalError;

      // Step 3: Calculate expenses based on ALL retrievals (items taken from main inventory)
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
          const supplierPrice = productMap[productId] ?? 0;
          const qty = Number(item.qty ?? item.quantity ?? 0);
          
          // ALL retrieved items are expenses (paid to supplier)
          total += supplierPrice * qty;
        });
      });

      // Step 4: DON'T subtract items in inventory
      // These are already included in the expenses when they were retrieved
      
      setTotalExpenses(total);
    } catch (err) {
      console.error("Error fetching total expenses:", err);
      setTotalExpenses(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="bg-white rounded p-3 m-4 shadow-sm" style={{height:"120px"}}>
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <FaFileInvoiceDollar size={24} className="text-danger me-2" />
          <h6 className="mb-0">Total Expenses</h6>
        </div>

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
        <h4 className="fw-bold text-danger mt-3">
          ₱{totalExpenses.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </h4>
      )}
    </Container>
  );
};

export default TotalExpensesPerYear;