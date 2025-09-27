import { useEffect, useMemo, useState } from "react";
import { Container, Spinner } from "react-bootstrap";
import { BarChart } from "@mui/x-charts/BarChart";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CiCalendar } from "react-icons/ci";
import { supabase } from "../supabaseClient";

const TopSalesByBrand = () => {
  const [raw, setRaw] = useState([]);      // [{ brand, total }]
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  // Year picker
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleYearSelect = (y) => { setYear(y); handleMenuClose(); };

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => now - i);
  }, []);

  useEffect(() => {
    fetchTopSalesByBrand(year);
  }, [year]);

  const fetchTopSalesByBrand = async (selectedYear) => {
    setLoading(true);
    try {
      // Map product_ID -> brand
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("product_ID, product_brand");
      if (prodError) throw prodError;

      const productMap = {};
      (products || []).forEach((p) => {
        productMap[p.product_ID] = p.product_brand || "Unknown";
      });

      // Transactions for the year
      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select(`
          id, created_at, status,
          transaction_items ( product_code, qty, price )
        `)
        .eq("status", "completed")
        .gte("created_at", `${selectedYear}-01-01`)
        .lt("created_at", `${selectedYear + 1}-01-01`);
      if (transError) throw transError;

      // Aggregate sales per brand
      const brandTotals = {};
      (transactions || []).forEach((t) => {
        t.transaction_items?.forEach((item) => {
          const brand = productMap[item.product_code] || "Unknown";
          const qty = Number(item.qty || 0);
          const price = Number(item.price || 0);
          brandTotals[brand] = (brandTotals[brand] || 0) + qty * price;
        });
      });

      const sorted = Object.entries(brandTotals)
        .map(([brand, total]) => ({ brand, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setRaw(sorted);
    } catch (e) {
      console.error("Error fetching top sales by brand:", e);
    } finally {
      setLoading(false);
    }
  };

  // 🎨 colors
  const brandColors = [
    "#4caf50", "#2196f3", "#ff9800", "#9c27b0", "#f44336",
    "#00bcd4", "#8bc34a", "#ff5722", "#3f51b5", "#795548",
  ];

  // Build a dataset where each row only has a value for its own brand key:
  // { brand: "Brit", Brit: 12345 }
  const dataset = raw.map(({ brand, total }) => ({ brand, [brand]: total }));

  // One series per brand, reading from its brand-named key.
  const series = raw.map(({ brand }, idx) => ({
    dataKey: brand,           // matches the dynamic key in dataset rows
    label: brand,
    color: brandColors[idx % brandColors.length],
  }));

  return (
    <Container className="bg-white rounded p-3 m-4 shadow-sm">
      <div className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Top Sales by Brand ({year})</h6>

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
      ) : dataset.length === 0 ? (
        <p className="text-muted mt-3">No sales data available</p>
      ) : (
        <BarChart
          dataset={dataset}
          xAxis={[{ scaleType: "band", dataKey: "brand", label: "Brand" }]}
          series={series}
          height={300}
          yAxis={[{
            label: "Sales (₱)",
            valueFormatter: (v) =>
              `₱${Number(v || 0).toLocaleString("en-PH")}`,
          }]}
          margin={{ top: 20, bottom: 50, left: 80, right: 20 }}
          slotProps={{
            legend: {
              direction: "row",
              position: { vertical: "bottom", horizontal: "middle" },
            },
          }}
        />
      )}
    </Container>
  );
};

export default TopSalesByBrand;
