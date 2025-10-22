// components/SalesTop5Chart.jsx
import { useEffect, useMemo, useState } from "react";
import { Spinner, Image } from "react-bootstrap";
import { BarChart } from "@mui/x-charts/BarChart";
import { supabase } from "../supabaseClient";
import { FaBoxOpen } from "react-icons/fa";

const COLORS = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"];
const currency = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

// ---- Local date utils (NO toISOString slicing) ----
const fmtYMD = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const parseYMD = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const listDaysInclusive = (fromYMD, toYMD) => {
  const out = [];
  const start = parseYMD(fromYMD);
  const end = parseYMD(toYMD);
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    out.push(fmtYMD(cur));
  }
  return out;
};

const SalesTop5Chart = ({ fromDate, toDate, productMap }) => {
  const [loading, setLoading] = useState(true);
  const [top5, setTop5] = useState([]);
  const [dailyDataset, setDailyDataset] = useState([]);
  const [seriesDefs, setSeriesDefs] = useState([]);

  // small CSS just for cards
  const styles = useMemo(
    () => ({
      cardCss: `
        .top5-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
        @media (max-width:1200px){.top5-grid{grid-template-columns:repeat(3,1fr)}}
        @media (max-width:768px){.top5-grid{grid-template-columns:repeat(2,1fr)}}
        @media (max-width:480px){.top5-grid{grid-template-columns:1fr}}
        .top5-card{border:1px solid #e9ecef;border-radius:10px;overflow:hidden;background:#fff;display:flex;flex-direction:column;height:100%}
        .top5-img{position:relative;width:100%;height:120px;background:#f8f9fa;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .top5-body{padding:10px 12px}
        .top5-name{font-weight:600;font-size:.9rem;line-height:1.2;max-height:2.4em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
        .rank-badge{position:absolute;top:8px;left:8px;color:#fff;font-size:.75rem;padding:2px 8px;border-radius:999px}
        .meta{color:#6c757d;font-size:.8rem}
      `,
    }),
    []
  );

  useEffect(() => {
    (async () => {
      if (!fromDate || !toDate) return;
      setLoading(true);
      try {
        // Build LOCAL start/end of day, then convert once to ISO for the query
        const start = parseYMD(fromDate);
        start.setHours(0, 0, 0, 0);
        const end = parseYMD(toDate);
        end.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from("transactions")
          .select(
            `
            id, created_at, status,
            transaction_items ( product_code, qty, price )
          `
          )
          .eq("status", "completed")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString()); // <= inclusive end-of-day

        if (error) throw error;

        const totalsByItem = {};
        const byDayItem = {};

        (data || []).forEach((t) => {
          // Bucket by LOCAL calendar day
          const dt = new Date(t.created_at);
          const ymd = fmtYMD(dt);
          if (!byDayItem[ymd]) byDayItem[ymd] = {};

          t.transaction_items?.forEach((it) => {
            const code = it.product_code;
            const qty = Number(it.qty || 0);
            const price = Number(it.price || 0);
            const sales = qty * price;

            if (!totalsByItem[code]) totalsByItem[code] = { qty: 0, sales: 0 };
            totalsByItem[code].qty += qty;
            totalsByItem[code].sales += sales;

            byDayItem[ymd][code] = (byDayItem[ymd][code] || 0) + sales;
          });
        });

        const rows = Object.entries(totalsByItem).map(([code, v]) => ({
          code,
          name: productMap?.[code]?.name || code,
          img: productMap?.[code]?.imgUrl || "/fallback.png",
          qty: v.qty,
          sales: v.sales,
        }));

        const top = rows.sort((a, b) => b.sales - a.sales).slice(0, 5);
        setTop5(top);

        const topCodes = top.map((r) => r.code);
        const topLabels = top.reduce((acc, r, i) => {
          acc[r.code] = { label: r.name, color: COLORS[i % COLORS.length] };
          return acc;
        }, {});

        // Build inclusive local day list
        const days = listDaysInclusive(fromDate, toDate);

        const daily = days.map((ymd) => {
          const row = {
            day: new Date(ymd).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
          };
          topCodes.forEach((code) => (row[code] = byDayItem[ymd]?.[code] || 0));
          return row;
        });

        setDailyDataset(daily);
        setSeriesDefs(
          topCodes.map((code) => ({
            dataKey: code,
            label: topLabels[code].label,
            color: topLabels[code].color,
          }))
        );
      } catch (e) {
        console.error("Top5/Chart error:", e);
        setTop5([]);
        setDailyDataset([]);
        setSeriesDefs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [fromDate, toDate, productMap]);

  return (
    <>
      <style>{styles.cardCss}</style>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-4">
          <Spinner animation="border" />
        </div>
      ) : top5.length === 0 ? (
        <div className="text-center text-muted py-3">No sales in range</div>
      ) : (
        <>
          {/* Top-5 cards */}
          <div className="top5-grid mb-4">
            {top5.map((it, i) => (
              <div className="top5-card" key={it.code}>
                <div className="top5-img">
                  {it.img ? (
                    <Image
                      src={it.img}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <FaBoxOpen size={48} color="#adb5bd" />
                  )}
                  <span
                    className="rank-badge"
                    style={{ background: COLORS[i % COLORS.length] }}
                  >
                    #{i + 1}
                  </span>
                </div>
                <div className="top5-body">
                  <div className="top5-name" title={it.name}>{it.name}</div>
                  <div className="meta">Qty: {it.qty}</div>
                  <div className="meta">Sales: {currency(it.sales)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stacked per-day chart */}
          {dailyDataset.length === 0 ? (
            <div className="text-center text-muted py-3">No daily data</div>
          ) : (
            <BarChart
              dataset={dailyDataset}
              xAxis={[{ dataKey: "day", scaleType: "band", label: "Day" }]}
              yAxis={[{ label: "Sales (₱)" }]}
              series={seriesDefs.map((s) => ({
                ...s,
                stack: "sales",
                valueFormatter: (v) => `₱${(v ?? 0).toLocaleString("en-PH")}`,
              }))}
              height={340}
              margin={{ top: 20, left: 70, right: 20, bottom: 40 }}
              slotProps={{ legend: { hidden: true } }}
            />
          )}
        </>
      )}
    </>
  );
};

export default SalesTop5Chart;
