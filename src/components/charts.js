import { BarChart } from "@mui/x-charts/BarChart";
import { Container } from "react-bootstrap";
import Button from "@mui/material/Button";
import { CiCalendar } from "react-icons/ci";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const Charts = () => {
  const [dataset, setDataset] = useState([]);

  const chartSetting = {
    yAxis: [
      {
        label: "Transactions (count)",
        width: 70,
      },
    ],
    height: 350,
  };

  // Load logs and aggregate by month
  useEffect(() => {
    fetchYearlyLogs();
  }, []);

  const fetchYearlyLogs = async () => {
    const year = new Date().getFullYear();

    const { data, error } = await supabase
      .from("logs")
      .select("product_action, created_at");

    if (error) {
      console.error("Error fetching logs:", error);
      return;
    }

    // Initialize monthly counters
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i).toLocaleString("en-US", { month: "short" }),
      restock: 0,
      unstock: 0,
    }));

    // Count Restock vs Unstock by month
    data.forEach((log) => {
      const date = new Date(log.created_at);
      if (date.getFullYear() === year) {
        const monthIndex = date.getMonth();
        if (log.product_action === "Restock") {
          monthlyData[monthIndex].restock++;
        } else if (log.product_action === "Unstock") {
          monthlyData[monthIndex].unstock++;
        }
      }
    });

    setDataset(monthlyData);
  };

  return (
    <Container className="bg-white m-4 rounded">
      <div>
        <div className="d-flex justify-content-between align-items-center">
          <span className="mx-1 mt-3 d-inline-block">Yearly Report</span>
          <Button
            variant="outlined"
            startIcon={<CiCalendar />}
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
            {new Date().getFullYear()}
          </Button>
        </div>

        <BarChart
          dataset={dataset}
          xAxis={[{ dataKey: "month", scaleType: "band" }]}
          series={[
            { dataKey: "restock", label: "Restock" },
            { dataKey: "unstock", label: "Unstock" },
          ]}
          {...chartSetting}
          className="mt-3"
        />
      </div>
    </Container>
  );
};

export default Charts;
