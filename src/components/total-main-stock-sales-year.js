import { useEffect, useState, useMemo } from "react";
import { Container, Spinner } from "react-bootstrap";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CiCalendar } from "react-icons/ci";
import { FaChartLine } from "react-icons/fa";
import { supabase } from "../supabaseClient";

const MainTotalSalesPerYear = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState([]);

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
    fetchPharmacyInventoryValue(year);
  }, [year]);

  const fetchPharmacyInventoryValue = async (selectedYear) => {
    setLoading(true);
    try {
      // Step 1: Fetch products to get selling prices (product_price)
      const { data: products, error: prodError } = await supabase
        .from("main_stock_room_products")
        .select("product_ID, product_price");
      if (prodError) throw prodError;

      const productMap = {};
      products.forEach((p) => {
        productMap[p.product_ID] = Number(p.product_price ?? 0);
      });

      // Step 2: Fetch all pharmacy items (admin_confirmed = true, status = pharmacy_stock)
      const { data: pharmacyItems, error: pharmacyError } = await supabase
        .from("pharmacy_waiting")
        .select("product_id, quantity, created_at, status")
        .eq("admin_confirmed", true)
        .eq("status", "pharmacy_stock");

      if (pharmacyError) throw pharmacyError;

      // Step 3: Calculate total current value
      let total = 0;
      const monthlyTotals = Array(12).fill(0);
      
      pharmacyItems.forEach((item) => {
        const sellPrice = productMap[item.product_id] ?? 0;
        const qty = Number(item.quantity ?? 0);
        const itemValue = sellPrice * qty;
        
        total += itemValue;
        
        // Track monthly data for the selected year
        if (item.created_at) {
          const itemDate = new Date(item.created_at);
          if (itemDate.getFullYear() === selectedYear) {
            const month = itemDate.getMonth(); // 0-11
            monthlyTotals[month] += itemValue;
          }
        }
      });

      setTotalValue(total);
      setMonthlyData(monthlyTotals);
    } catch (err) {
      console.error("Error fetching pharmacy inventory value:", err);
      setTotalValue(0);
      setMonthlyData([]);
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const getMonthColor = (value) => {
    const maxValue = Math.max(...monthlyData);
    if (maxValue === 0) return "#e0e0e0";
    
    const percentage = (value / maxValue) * 100;
    if (percentage > 75) return "#28a745"; // Dark green
    if (percentage > 50) return "#20c997"; // Medium green
    if (percentage > 25) return "#0dcaf0"; // Light blue
    return "#f8f9fa"; // Very light
  };

  return (
    <Container className="bg-white rounded p-3 m-4 shadow-sm" style={{height:"120px"}}>
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <FaChartLine size={24} className="text-success me-2" />
          <h6 className="mb-0">Pharmacy Inventory Value</h6>
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
        <>
          <h4 className="fw-bold text-success mt-3">
            ₱{totalValue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </h4>
          
          {/* Monthly breakdown for selected year */}
          <div className="mt-3">
           
            <div className="d-flex flex-wrap gap-2">
             
            </div>
          </div>
        </>
      )}
    </Container>
  );
};

export default MainTotalSalesPerYear;