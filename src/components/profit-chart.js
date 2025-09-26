import { BarChart } from "@mui/x-charts/BarChart";
import { Container } from "react-bootstrap";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CiCalendar } from "react-icons/ci";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const ProfitChart = () => {
  const [dataset, setDataset] = useState([]);
  const [productMap, setProductMap] = useState({}); // product_ID -> { name, supplier_price, product_price }
  const [view, setView] = useState("year");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());

  // 🔹 Year menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleYearSelect = (y) => {
    setYear(y);
    handleMenuClose();
  };

  // Pick the last 10 years (customize as you like)
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => now - i);
  }, []);

  const chartSetting = {
    yAxis: [{ label: "Profit", width: 70 }],
    height: 250,
  };

  // fetch products once
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("product_ID, product_name, supplier_price, product_price");
      if (error) {
        console.error("Error fetching products:", error);
        return;
      }
      const map = {};
      data.forEach((p) => {
        map[p.product_ID] = {
          name: p.product_name,
          supplier_price: Number(p.supplier_price ?? 0),
          product_price: Number(p.product_price ?? 0),
        };
      });
      setProductMap(map);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (Object.keys(productMap).length) fetchYearlyProfit(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, productMap]);

  const profitForItem = (item) => {
    const prod = productMap[item.product_code];
    if (!prod) return 0;
    const sellPrice = Number(item.price ?? prod.product_price ?? 0);
    const supplier = Number(prod.supplier_price ?? 0);
    const qty = Number(item.qty ?? 1);
    return (sellPrice - supplier) * qty;
  };

  const initRowForProducts = (base) => {
    const row = { ...base };
    Object.keys(productMap).forEach((pid) => (row[pid] = 0));
    return row;
  };

  const fetchYearlyProfit = async (selectedYear) => {
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        id, created_at, status,
        transaction_items ( product_code, qty, price )
      `)
      .eq("status", "completed")
      // optional: limit payload to the chosen year
      .gte("created_at", `${selectedYear}-01-01`)
      .lt("created_at", `${selectedYear + 1}-01-01`);
    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    const monthlyData = Array.from({ length: 12 }, (_, i) =>
      initRowForProducts({
        monthIndex: i,
        month: new Date(selectedYear, i).toLocaleString("en-US", { month: "short" }),
      })
    );

    data.forEach((t) => {
      const d = new Date(t.created_at);
      if (d.getFullYear() !== selectedYear) return;
      const m = d.getMonth();
      t.transaction_items?.forEach((item) => {
        const pid = item.product_code;
        if (!productMap[pid]) return;
        monthlyData[m][pid] += Number(profitForItem(item) || 0);
      });
    });

    setDataset(monthlyData);
    setView("year");
  };

  const fetchDailyProfit = async (monthIndex) => {
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        id, created_at, status,
        transaction_items ( product_code, qty, price )
      `)
      .eq("status", "completed")
      // optional: limit to the chosen month
      .gte("created_at", `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`)
      .lt(
        "created_at",
        `${year}-${String(monthIndex + 2).padStart(2, "0")}-01`
      );
    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    const days = new Date(year, monthIndex + 1, 0).getDate();
    const dailyData = Array.from({ length: days }, (_, i) =>
      initRowForProducts({ day: String(i + 1) })
    );

    data.forEach((t) => {
      const d = new Date(t.created_at);
      if (d.getFullYear() !== year || d.getMonth() !== monthIndex) return;
      const dayIdx = d.getDate() - 1;
      t.transaction_items?.forEach((item) => {
        const pid = item.product_code;
        if (!productMap[pid]) return;
        dailyData[dayIdx][pid] += Number(profitForItem(item) || 0);
      });
    });

    setDataset(dailyData);
    setView("month");
    setSelectedMonth(monthIndex);
  };

  const handleBarClick = (event, item) => {
    if (view === "year") {
      const row = dataset[item.dataIndex];
      if (row && row.monthIndex !== undefined) fetchDailyProfit(row.monthIndex);
    }
  };

  return (
    <Container className="bg-white m-4 rounded">
      <div>
        <div className="d-flex justify-content-between align-items-center">
          <span className="mx-1 mt-3 d-inline-block">
            {view === "year"
              ? `Yearly Profit by Product - ${year}`
              : `Daily Profit by Product - ${new Date(
                  year,
                  selectedMonth
                ).toLocaleString("en-US", { month: "long" })} ${year}`}
          </span>

          <div className="d-flex align-items-center gap-2 mt-3">
            {view === "month" && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => fetchYearlyProfit(year)}
                sx={{
                  borderColor: "#6c757d !important",
                  color: "#6c757d",
                  "&:hover": { borderColor: "#495057 !important", color: "#495057" },
                }}
              >
                Back
              </Button>
            )}

            {/* 🔹 Year picker (same behavior/style as your other chart) */}
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
          xAxis={[{ dataKey: view === "year" ? "month" : "day", scaleType: "band" }]}
          series={Object.keys(productMap).map((pid) => ({
            dataKey: pid,
            label: productMap[pid].name || pid,
          }))}
          {...chartSetting}
          className="mt-3"
          onItemClick={handleBarClick}
          slotProps={{ legend: { hidden: true } }}
        />
      </div>
    </Container>
  );
};

export default ProfitChart;
