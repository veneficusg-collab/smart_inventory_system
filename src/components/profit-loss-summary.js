// components/ProfitLossSummary.jsx
import { useEffect, useMemo, useState } from "react";
import { Spinner } from "react-bootstrap";
import { FaBoxOpen } from "react-icons/fa"; // 👈 fallback icon
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { supabase } from "../supabaseClient";

const currency = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const ProfitLossSummary = ({ fromDate, toDate, productMap }) => {
  const [loading, setLoading] = useState(true);
  const [grossSales, setGrossSales] = useState(0);
  const [cogs, setCogs] = useState(0);
  const netSales = useMemo(() => grossSales - cogs, [grossSales, cogs]);

  const [incomeRows, setIncomeRows] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);

  useEffect(() => {
    (async () => {
      if (!fromDate || !toDate) return;
      setLoading(true);
      try {
        const startISO = `${fromDate}T00:00:00.000Z`;
        const end = new Date(toDate);
        end.setDate(end.getDate() + 1);
        const endISO = end.toISOString();

        const { data, error } = await supabase
          .from("transactions")
          .select(
            `
            id, created_at, status,
            transaction_items ( product_code, qty, price )
          `
          )
          .eq("status", "completed")
          .gte("created_at", startISO)
          .lt("created_at", endISO);
        if (error) throw error;

        const perItem = {};
        let gross = 0;
        let cogsTotal = 0;

        (data || []).forEach((t) => {
          t.transaction_items?.forEach((it) => {
            const code = it.product_code;
            const qty = Number(it.qty || 0);
            const price = Number(it.price || 0);
            const sales = qty * price;

            if (!perItem[code]) perItem[code] = { qty: 0, sales: 0 };
            perItem[code].qty += qty;
            perItem[code].sales += sales;

            gross += sales;
            const sp = productMap[code]?.supplier_price ?? 0;
            cogsTotal += sp * qty;
          });
        });

        const incomes = Object.entries(perItem)
          .map(([code, v]) => ({
            code,
            name: productMap[code]?.name || code,
            img: productMap[code]?.imgUrl || null,
            qty: v.qty,
            sales: v.sales,
            avg_price: v.qty ? v.sales / v.qty : 0,
          }))
          .sort((a, b) => b.sales - a.sales);

        const expenses = Object.entries(perItem)
          .map(([code, v]) => {
            const sp = productMap[code]?.supplier_price ?? 0;
            return {
              code,
              name: productMap[code]?.name || code,
              img: productMap[code]?.imgUrl || null,
              qty: v.qty,
              supplier_price: sp,
              total_cost: sp * v.qty,
            };
          })
          .sort((a, b) => b.total_cost - a.total_cost);

        setGrossSales(gross);
        setCogs(cogsTotal);
        setIncomeRows(incomes);
        setExpenseRows(expenses);
      } catch (e) {
        console.error("P/L error:", e);
        setGrossSales(0);
        setCogs(0);
        setIncomeRows([]);
        setExpenseRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [fromDate, toDate, productMap]);

  return (
    <>
      <style>{`
        .kpi{display:flex;gap:16px;flex-wrap:wrap;margin:.5rem 0 1rem}
        .kpi>div{flex:1 1 220px;border:1px solid #e9ecef;border-radius:10px;padding:12px 14px;background:#fff}
        .kpi .label{color:#6c757d;font-size:.85rem}
        .kpi .value{font-weight:700;font-size:1.15rem}
        .name-cell{display:flex;align-items:center;gap:8px;}
        .name-img{width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#f1f3f5;border-radius:6px;overflow:hidden;}
        .name-img img{width:100%;height:100%;object-fit:cover;}
      `}</style>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-4">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="kpi">
            <div>
              <div className="label">Profit / Loss Total</div>
              <div
                className="value"
                style={{
                  color: grossSales - cogs >= 0 ? "#2f9e44" : "#e03131",
                }}
              >
                {currency(grossSales - cogs)}
              </div>
            </div>
            <div>
              <div className="label">Gross Sales</div>
              <div className="value">{currency(grossSales)}</div>
            </div>
            <div>
              <div className="label">Gross Profit</div>
              <div className="value">{currency(netSales)}</div>
            </div>
          </div>

          {/* Expenses Summary */}
          <h6 className="mt-2 mb-2">Expenses Summary (COGS)</h6>
          <TableContainer component={Paper} className="mb-3">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Supplier Price</TableCell>
                  <TableCell align="right">Total Cost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenseRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      No expenses in range
                    </TableCell>
                  </TableRow>
                ) : (
                  expenseRows.map((r) => (
                    <TableRow key={r.code}>
                      <TableCell>
                        <div className="name-cell">
                          <div className="name-img">
                            {r.img ? (
                              <img
                                src={r.img}
                                alt={r.name}
                                onError={(e) => (e.currentTarget.style.display = "none")}
                              />
                            ) : (
                              <FaBoxOpen size={20} color="#adb5bd" />
                            )}
                          </div>
                          {r.name}
                        </div>
                      </TableCell>
                      <TableCell align="right">{r.qty}</TableCell>
                      <TableCell align="right">{currency(r.supplier_price)}</TableCell>
                      <TableCell align="right">{currency(r.total_cost)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Income Summary */}
          <h6 className="mb-2">Income Summary</h6>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Avg Selling Price</TableCell>
                  <TableCell align="right">Total Sales</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {incomeRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      No income in range
                    </TableCell>
                  </TableRow>
                ) : (
                  incomeRows.map((r) => (
                    <TableRow key={r.code}>
                      <TableCell>
                        <div className="name-cell">
                          <div className="name-img">
                            {r.img ? (
                              <img
                                src={r.img}
                                alt={r.name}
                                onError={(e) => (e.currentTarget.style.display = "none")}
                              />
                            ) : (
                              <FaBoxOpen size={20} color="#adb5bd" />
                            )}
                          </div>
                          {r.name}
                        </div>
                      </TableCell>
                      <TableCell align="right">{r.qty}</TableCell>
                      <TableCell align="right">{currency(r.avg_price)}</TableCell>
                      <TableCell align="right">{currency(r.sales)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </>
  );
};

export default ProfitLossSummary;
