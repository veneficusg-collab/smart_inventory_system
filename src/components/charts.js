import { BarChart } from "@mui/x-charts/BarChart";
import { Container } from "react-bootstrap";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CiCalendar } from "react-icons/ci";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const Charts = () => {
  const [dataset, setDataset] = useState([]);
  const [products, setProducts] = useState([]);
  const [view, setView] = useState("year"); // "year" or "month"
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear()); // chosen year

  // menu state for year picker
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const chartSetting = {
    yAxis: [
      {
        label: "Completed Transactions (count)",
        width: 70,
      },
    ],
    height: 400,
  };

  useEffect(() => {
    fetchYearlyTransactions(year);
  }, [year]);

  const fetchYearlyTransactions = async (selectedYear) => {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        id,
        created_at,
        status,
        transaction_items (
          product_code,
          qty
        )
        `
      )
      .eq("status", "completed");

    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    const productSet = new Set();
    data.forEach((t) =>
      t.transaction_items?.forEach((item) => productSet.add(item.product_code))
    );
    const productList = Array.from(productSet);
    setProducts(productList);

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const row = {
        monthIndex: i,
        month: new Date(selectedYear, i).toLocaleString("en-US", { month: "short" }),
      };
      productList.forEach((p) => {
        row[p] = 0;
      });
      return row;
    });

    data.forEach((transaction) => {
      const date = new Date(transaction.created_at);
      if (date.getFullYear() === selectedYear) {
        const monthIndex = date.getMonth();
        transaction.transaction_items?.forEach((item) => {
          monthlyData[monthIndex][item.product_code] += item.qty || 1;
        });
      }
    });

    setDataset(monthlyData);
    setView("year");
  };

  const fetchDailyTransactions = async (monthIndex) => {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        id,
        created_at,
        status,
        transaction_items (
          product_code,
          qty
        )
        `
      )
      .eq("status", "completed");

    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    const productList = products;

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
      const row = { day: (i + 1).toString() };
      productList.forEach((p) => (row[p] = 0));
      return row;
    });

    data.forEach((transaction) => {
      const date = new Date(transaction.created_at);
      if (date.getFullYear() === year && date.getMonth() === monthIndex) {
        const dayIndex = date.getDate() - 1;
        transaction.transaction_items?.forEach((item) => {
          dailyData[dayIndex][item.product_code] += item.qty || 1;
        });
      }
    });

    setDataset(dailyData);
    setView("month");
    setSelectedMonth(monthIndex);
  };

  const handleBarClick = (event, item) => {
    if (view === "year") {
      const row = dataset[item.dataIndex];
      if (row && row.monthIndex !== undefined) {
        fetchDailyTransactions(row.monthIndex);
      }
    }
  };

  const handleYearSelect = (newYear) => {
    setYear(newYear);
    handleMenuClose();
  };

  return (
    <Container className="bg-white m-4 rounded">
      <div>
        <div className="d-flex justify-content-between align-items-center">
          <span className="mx-1 mt-3 d-inline-block">
            {view === "year"
              ? `Yearly Completed Transactions - ${year}`
              : `Daily Completed Transactions - ${new Date(
                  year,
                  selectedMonth
                ).toLocaleString("en-US", { month: "long" })} ${year}`}
          </span>
          <div className="d-flex">
            {view === "month" && (
              <Button
                variant="outlined"
                onClick={() => fetchYearlyTransactions(year)}
                sx={{
                  borderColor: "#6c757d !important",
                  color: "#6c757d",
                  "&:hover": {
                    borderColor: "#495057 !important",
                    color: "#495057",
                  },
                }}
                className="mt-3 mx-1"
                size="small"
              >
                Back
              </Button>
            )}

            {/* Year Picker Button */}
            <Button
              variant="outlined"
              startIcon={<CiCalendar />}
              onClick={handleMenuOpen}
              sx={{
                borderColor: "#6c757d !important",
                color: "#6c757d",
                "&:hover": {
                  borderColor: "#495057 !important",
                  color: "#495057",
                },
              }}
              className="mt-3"
              size="small"
            >
              {year}
            </Button>
            <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
              {[2024, 2025, 2026, 2027].map((y) => (
                <MenuItem key={y} onClick={() => handleYearSelect(y)}>
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
            },
          ]}
          series={products.map((p) => ({
            dataKey: p,
            label: p,
          }))}
          {...chartSetting}
          className="mt-3"
          onItemClick={handleBarClick}
        />
      </div>
    </Container>
  );
};

export default Charts;
