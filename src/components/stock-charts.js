import { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { LineChart } from "@mui/x-charts";
import { supabase } from "../supabaseClient";

const StockCharts = () => {
  const [restockData, setRestockData] = useState(Array(12).fill(0));
  const [unstockData, setUnstockData] = useState(Array(12).fill(0));

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase.from("logs").select("*");
      if (error) {
        console.error("Error fetching logs:", error);
        return;
      }

      // Arrays for monthly totals
      const restock = Array(12).fill(0);
      const unstock = Array(12).fill(0);

      data.forEach((log) => {
        if (!log.created_at) return;

        const date = new Date(log.created_at);
        const monthIndex = date.getMonth(); // 0 = Jan, 11 = Dec

        if (log.product_action === "Restock") {
          restock[monthIndex] += log.product_quantity || 0;
        } else if (log.product_action === "Unstock") {
          unstock[monthIndex] += log.product_quantity || 0;
        }
      });

      setRestockData(restock);
      setUnstockData(unstock);
    };

    fetchLogs();
  }, []);

  return (
    <Container
      className="bg-white m-4 rounded p-0"
    >
      <LineChart
        xAxis={[
          {
            data: months,
            scaleType: "point",
          },
        ]}
        series={[
          {
            data: restockData,
            label: "Restock",
            valueFormatter: (value) =>
              value == null ? "No data" : `${value} units`,
          },
          {
            data: unstockData,
            label: "Unstock",
            valueFormatter: (value) =>
              value == null ? "No data" : `${value} units`,
          },
        ]}
        height={300}
        
        margin={{ bottom: 50, top: 20 }}
        yAxis={[
          {
            label: "Number of Stocks",
          },
        ]}
      />
    </Container>
  );
};

export default StockCharts;
