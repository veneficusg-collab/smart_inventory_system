import { useEffect, useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import { BarChart } from "@mui/x-charts/BarChart";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CiCalendar } from "react-icons/ci";
import { supabase } from "../supabaseClient";

const Charts = () => {
  const [dataset, setDataset] = useState([]);      // months or days, depending on view
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState("year");        // "year" | "month"
  const [selectedMonth, setSelectedMonth] = useState(null); // 0-11 when in "month" view

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
    // whenever year changes, refresh the monthly view
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
      setView("year");
      setSelectedMonth(null);
      return;
    }

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      month: new Date(selectedYear, i).toLocaleString("en-US", { month: "short" }),
      total: 0,
    }));

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
    setView("year");
    setSelectedMonth(null);
  };

  const fetchDailySales = async (monthIndex) => {
    const mm = String(monthIndex + 1).padStart(2, "0");
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        id,
        created_at,
        status,
        transaction_items ( product_code, qty, price )
      `)
      .eq("status", "completed")
      .gte("created_at", `${year}-${mm}-01`)
      .lt("created_at", `${year}-${String(monthIndex + 2).padStart(2, "0")}-01`);

    if (error) {
      console.error("Error fetching daily transactions:", error);
      setDataset([]);
      return;
    }

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const daily = Array.from({ length: daysInMonth }, (_, i) => ({
      dayIndex: i,
      day: String(i + 1), // "1"..."31"
      total: 0,
    }));

    (data || []).forEach((t) => {
      const d = new Date(t.created_at);
      if (d.getFullYear() !== year || d.getMonth() !== monthIndex) return;
      const di = d.getDate() - 1;
      t.transaction_items?.forEach((item) => {
        const qty = Number(item.qty ?? 0);
        const price = Number(item.price ?? 0);
        daily[di].total += qty * price;
      });
    });

    setDataset(daily);
    setView("month");
    setSelectedMonth(monthIndex);
  };

  const handleBarClick = (event, item) => {
    if (view === "year") {
      const row = dataset[item.dataIndex];
      if (row && typeof row.monthIndex === "number") {
        fetchDailySales(row.monthIndex);
      }
    }
  };

  return (
    <Container className="bg-white m-4 rounded">
      <div className="d-flex justify-content-between align-items-center">
        <span className="mx-1 mt-3 d-inline-block">
          {view === "year"
            ? `Sales per Month — ${year}`
            : `Daily Sales — ${new Date(year, selectedMonth).toLocaleString("en-US", {
                month: "long",
              })} ${year}`}
        </span>

        <div className="d-flex align-items-center gap-2 mt-3">
          {view === "month" && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => fetchMonthlySales(year)}
              sx={{
                borderColor: "#6c757d !important",
                color: "#6c757d",
                "&:hover": { borderColor: "#495057 !important", color: "#495057" },
              }}
            >
              Back
            </Button>
          )}

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
      </div>

      <BarChart
        dataset={dataset}
        xAxis={[
          {
            dataKey: view === "year" ? "month" : "day",
            scaleType: "band",
            label: view === "year" ? undefined : "Day",
          },
        ]}
        series={[{ dataKey: "total", label: "Sales (₱)" }]}
        {...chartSetting}
        className="mt-3"
        slotProps={{ legend: { hidden: true } }}
        onItemClick={handleBarClick}
      />
    </Container>
  );
};

export default Charts;
