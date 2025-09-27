import { useEffect, useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import { BarChart } from "@mui/x-charts/BarChart";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CiCalendar } from "react-icons/ci";
import { supabase } from "../supabaseClient";

const Charts = () => {
  const [dataset, setDataset] = useState([]); // [{ monthIndex, month, total }]
  const [year, setYear] = useState(new Date().getFullYear());
  const [anchorEl, setAnchorEl] = useState(null);

  const open = Boolean(anchorEl);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleYearSelect = (y) => {
    setYear(y);
    handleMenuClose();
  };

  // last 10 years
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => now - i);
  }, []);

  const chartSetting = {
    yAxis: [
      {
        label: "Sales (₱)",
        width: 80,
        valueFormatter: (v) => `₱${Number(v || 0).toLocaleString("en-PH")}`,
      },
    ],
    height: 250,
    margin: { top: 16, right: 20, bottom: 40, left: 80 },
  };

  useEffect(() => {
    fetchMonthlySales(year);
  }, [year]);

  const fetchMonthlySales = async (selectedYear) => {
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        id,
        created_at,
        status,
        transaction_items ( product_code, qty, price )
      `)
      .eq("status", "completed")
      .gte("created_at", `${selectedYear}-01-01`)
      .lt("created_at", `${selectedYear + 1}-01-01`);

    if (error) {
      console.error("Error fetching transactions:", error);
      setDataset([]);
      return;
    }

    // base rows for each month
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      month: new Date(selectedYear, i).toLocaleString("en-US", { month: "short" }),
      total: 0,
    }));

    // sum price * qty into the month’s total
    (data || []).forEach((t) => {
      const d = new Date(t.created_at);
      if (d.getFullYear() !== selectedYear) return;
      const m = d.getMonth();
      t.transaction_items?.forEach((item) => {
        const qty = Number(item.qty ?? 0);
        const price = Number(item.price ?? 0);
        monthly[m].total += qty * price;
      });
    });

    setDataset(monthly);
  };

  return (
    <Container className="bg-white m-4 rounded">
      <div className="d-flex justify-content-between align-items-center">
        <span className="mx-1 mt-3 d-inline-block">
          Sales per Month — {year}
        </span>

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
            <MenuItem key={y} selected={y === year} onClick={() => handleYearSelect(y)}>
              {y}
            </MenuItem>
          ))}
        </Menu>
      </div>

      <BarChart
        dataset={dataset}
        xAxis={[{ dataKey: "month", scaleType: "band" }]}
        series={[{ dataKey: "total", label: "Sales (₱)" }]}
        {...chartSetting}
        className="mt-3"
        slotProps={{ legend: { hidden: true } }}
      />
    </Container>
  );
};

export default Charts;
