import { Container } from "react-bootstrap";
import { LineChart } from "@mui/x-charts";
const StockCharts = () => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return (
    <Container className="bg-white mx-2 my-3 rounded p-0" style={{width:"1230px"}}>
       <LineChart
      xAxis={[{ 
        data: months,
        scaleType: 'point', // Use 'point' for categorical data like months
      }]}
      series={[
        {
          data: [150, 180, 220, 190, 250, 280, 320, 290, 310, 280, 260, 300],
          label: 'Stock in',
          valueFormatter: (value) => (value == null ? 'No data' : `${value} units`),
        },
        {
          data: [80, 95, 110, 105, 130, 145, 160, 155, 170, 165, 140, 175],
          label: 'Stock out',
          valueFormatter: (value) => (value == null ? 'No data' : `${value} units`),
        },
      ]}
      height={300}
      width={1200}
      margin={{ left: 10, bottom: 50, top: 20, right: 10 }}
      yAxis={[{
        label: 'Number of Stocks'
      }]}
    />
    </Container>
  );
};

export default StockCharts;
