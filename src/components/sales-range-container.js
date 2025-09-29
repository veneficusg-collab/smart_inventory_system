// components/SalesRangeContainer.jsx
import { useEffect, useState } from "react";
import { Container, Spinner } from "react-bootstrap";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { CiRepeat } from "react-icons/ci";
import { supabase } from "../supabaseClient";


import SalesTop5Chart from "./top-sales-range";
import ProfitLossSummary from "./profit-loss-summary";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const SalesRangeContainer = () => {
  const todayISO = new Date().toISOString().slice(0, 10);
  const sevenAgoISO = new Date(Date.now() - 6 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [fromDate, setFromDate] = useState(sevenAgoISO);
  const [toDate, setToDate] = useState(todayISO);
  const [mode, setMode] = useState("sales"); // 'sales' | 'pl'

  // product meta fetched once and shared with children
  const [productMap, setProductMap] = useState(null); // code -> {name, imgUrl, supplier_price}
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingMeta(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("product_ID, product_name, product_img, supplier_price");
        if (error) throw error;

        const map = {};
        (data || []).forEach((p) => {
          let url = "/fallback.png";
          if (p.product_img) {
            if (String(p.product_img).startsWith("http")) {
              url = p.product_img;
            } else {
              const { data: pub } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(`products/${p.product_img}`);
              url = pub?.publicUrl || "/fallback.png";
            }
          }
          map[p.product_ID] = {
            name: p.product_name || p.product_ID,
            imgUrl: url,
            supplier_price: Number(p.supplier_price ?? 0),
          };
        });
        setProductMap(map);
      } catch (e) {
        console.error("Product meta error:", e);
        setProductMap({});
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  return (
    <Container className="bg-white rounded p-3 m-4 shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">
          {mode === "sales" ? "Sales by Item (Per Day in Range)" : "Profit / Loss (Selected Range)"}
        </h6>

        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outlined"
            startIcon={<CiRepeat />}
            onClick={() => setMode((m) => (m === "sales" ? "pl" : "sales"))}
            sx={{
              borderColor: "#6c757d !important",
              color: "#6c757d",
              "&:hover": { borderColor: "#495057 !important", color: "#495057" },
            }}
            size="small"
          >
            {mode === "sales" ? "Show Profit/Loss" : "Show Sales Chart"}
          </Button>

          <TextField
            type="date"
            size="small"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <span className="text-muted">to</span>
          <TextField
            type="date"
            size="small"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {loadingMeta ? (
        <div className="d-flex justify-content-center align-items-center py-4">
          <Spinner animation="border" />
        </div>
      ) : mode === "sales" ? (
        <SalesTop5Chart fromDate={fromDate} toDate={toDate} productMap={productMap} />
      ) : (
        <ProfitLossSummary fromDate={fromDate} toDate={toDate} productMap={productMap} />
      )}
    </Container>
  );
};

export default SalesRangeContainer;
