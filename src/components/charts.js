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
  const [products, setProducts] = useState({}); // mapping product_ID -> product_name
  const [view, setView] = useState("year");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());

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

  // fetch products once
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("product_ID, product_name");

      if (error) {
        console.error("Error fetching products:", error);
        return;
      }

      const mapping = {};
      data.forEach((p) => {
        mapping[p.product_ID] = p.product_name;
      });
      setProducts(mapping);
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    fetchYearlyTransactions(year);
  }, [year, products]);

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

    const productIDs = new Set();
    data.forEach((t) =>
      t.transaction_items?.forEach((item) => productIDs.add(item.product_code))
    );

    const productList = Array.from(productIDs);

    // build monthly skeleton
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const row = {
        monthIndex: i,
        month: new Date(selectedYear, i).toLocaleString("en-US", {
          month: "short",
        }),
      };
      productList.forEach((p) => {
        row[p] = 0;
      });
      return row;
    });

    // fill data
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

    const productList = Object.keys(products);

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

          <div className="d-flex align-items-center gap-2 mt-3">
            {/* 🔹 Back button (only in month view) */}
            {view === "month" && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => fetchYearlyTransactions(year)}
                sx={{
                  borderColor: "#6c757d !important",
                  color: "#6c757d",
                  "&:hover": {
                    borderColor: "#495057 !important",
                    color: "#495057",
                  },
                }}
              >
                Back
              </Button>
            )}

            {/* 🔹 Year button */}
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
              size="small"
            >
              {year}
            </Button>
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
          series={Object.keys(products).map((id) => ({
            dataKey: id, // product_ID or code
            label: products[id], // show product_name instead of ID
          }))}
          {...chartSetting}
          className="mt-3"
          onItemClick={handleBarClick}
          slotProps={{
            legend: { hidden: true }, // hide legend
          }}
        />
      </div>
    </Container>
  );
};

export default Charts;
