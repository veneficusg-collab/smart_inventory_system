import { BarChart } from "@mui/x-charts/BarChart";
import { dataset, valueFormatter } from "../seeds/weather";
import { Container } from "react-bootstrap";
import Button from "@mui/material/Button";
import { CiCalendar } from "react-icons/ci";

const Charts = () => {
  const chartSetting = {
    yAxis: [
      {
        label: "rainfall (mm)",
        width: 60,
      },
    ],
    height: 300,
  };

  return (
    <Container className="bg-white m-4 rounded">
      <div>
        <div className="d-flex justify-content-between align-items-center">
          <span className="mx-1 mt-3 d-inline-block">Daily Report</span>
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
            //   height: "30px",
            //   width: "105px",
            }}
            className="mt-3"
            size="small"
          >
            Monthly
          </Button>
        </div>

        <BarChart
          dataset={dataset}
          xAxis={[{ dataKey: "month" }]}
          series={[
            { dataKey: "london", label: "London", valueFormatter },
            { dataKey: "paris", label: "Paris", valueFormatter },
            { dataKey: "newYork", label: "New York", valueFormatter },
            { dataKey: "seoul", label: "Seoul", valueFormatter },
          ]}
          {...chartSetting}
          className="mt-3"
          
        />
      </div>
    </Container>
  );
};

export default Charts;
