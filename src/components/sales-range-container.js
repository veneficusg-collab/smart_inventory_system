// components/SalesRangeContainer.jsx
import { useEffect, useMemo, useState } from "react";
import { Container, Spinner } from "react-bootstrap";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { CiRepeat } from "react-icons/ci";
import { supabase } from "../supabaseClient";

import SalesTop5Chart from "./top-sales-range";
import ProfitLossSummary from "./profit-loss-summary";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

// ---- Local date helpers (avoid UTC off-by-one) ----
const toYMD = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const startOfLocalDayISO = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString(); // local -> ISO
};
const endOfLocalDayISO = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
};

const SalesRangeContainer = () => {
  // Build defaults entirely in local time
  const todayLocal = new Date();
  const sevenAgoLocal = new Date(
    todayLocal.getFullYear(),
    todayLocal.getMonth(),
    todayLocal.getDate() - 6
  );

  const [fromDate, setFromDate] = useState(toYMD(sevenAgoLocal));
  const [toDate, setToDate] = useState(toYMD(todayLocal));
  const [mode, setMode] = useState("sales"); // 'sales' | 'pl'

  // product meta fetched once and shared with children
  const [productMap, setProductMap] = useState(null); // code -> {name, imgUrl, supplier_price}
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Compute correct ISO range for queries (local start/end of day)
  const { fromISO, toISO } = useMemo(
    () => ({
      fromISO: startOfLocalDayISO(fromDate),
      toISO: endOfLocalDayISO(toDate),
    }),
    [fromDate, toDate]
  );

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
          {mode === "sales"
            ? "Sales by Item (Per Day in Range)"
            : "Profit / Loss (Selected Range)"}
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
        // Passing corrected ISO range as well (children can use fromISO/toISO for queries)
        <SalesTop5Chart
          fromDate={fromDate}
          toDate={toDate}
          fromISO={fromISO}
          toISO={toISO}
          productMap={productMap}
        />
      ) : (
        <ProfitLossSummary
          fromDate={fromDate}
          toDate={toDate}
          fromISO={fromISO}
          toISO={toISO}
          productMap={productMap}
        />
      )}
    </Container>
  );
};

export default SalesRangeContainer;
