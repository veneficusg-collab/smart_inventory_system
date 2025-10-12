import { Container, Row, Col, Button } from "react-bootstrap";
import { useState } from "react";
import QuickReport from "./quick-report";
import ProductsAndServices from "./products-and-services";
import Order from "./order";
import Payments from "./payments";
import { supabase } from "../supabaseClient";

const POS = () => {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [refreshProducts, setRefreshProducts] = useState(0);
  const [lastTransactionId, setLastTransactionId] = useState(null); // 👈 store for printing

  const handleAddProduct = (product) => {
    setOrders((prevOrders) => {
      const existing = prevOrders.find(
        (o) =>
          o.product_name === product.product_name &&
          o.price === product.product_price
      );

      if (existing) {
        return prevOrders.map((o) =>
          o.product_name === product.product_name &&
          o.price === product.product_price
            ? { ...o, qty: o.qty + 1 }
            : o
        );
      }

      return [
        ...prevOrders,
        {
          product_ID: product.product_ID,
          product_name: product.name,
          price: Number(product.price) || 0,
          qty: 1,
        },
      ];
    });
  };

  const handleQtyChange = (idx, value) => {
    setOrders((prevOrders) => {
      const updated = [...prevOrders];
      updated[idx].qty = value === "" ? 0 : parseInt(value, 10);
      return updated;
    });
  };

  const handleDelete = (idx) => {
    setOrders((prevOrders) => prevOrders.filter((_, i) => i !== idx));
  };

  const handleReset = () => {
    setOrders([]);
    setPayments([]);
    setLastTransactionId(null);
  };

  const total = orders.reduce((sum, o) => sum + o.qty * o.price, 0);

  // 🧾 Print function
  // 🧾 Print function (drop-in replacement)
  const handlePrintReceipt = async (transactionIdParam) => {
    const transactionId = transactionIdParam || lastTransactionId;
    if (!transactionId) {
      alert("No recent transaction found to print.");
      return;
    }

    try {
      // 1) Get items for this transaction
      const { data: items, error: itemsErr } = await supabase
        .from("transaction_items")
        .select("product_code, qty, price, subtotal")
        .eq("transaction_id", transactionId);

      if (itemsErr) throw itemsErr;
      if (!items || items.length === 0)
        throw new Error("No items found for this transaction.");

      // 2) Get product names in one query
      const codes = [...new Set(items.map((i) => i.product_code))].filter(
        Boolean
      );
      const { data: prods, error: prodErr } = await supabase
        .from("products")
        .select("product_ID, product_name")
        .in("product_ID", codes);

      if (prodErr) throw prodErr;

      const nameByCode = Object.fromEntries(
        (prods || []).map((p) => [p.product_ID, p.product_name])
      );

      // 3) Staff name (from localStorage as you had)
      const storedUser = localStorage.getItem("user");
      let staffName = "Staff";
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          staffName = parsed.staff_name || "Staff";
        } catch {}
      }

      const totalAmount = items.reduce((sum, it) => sum + it.qty * it.price, 0);

      // 4) Build HTML
      const popup = window.open("", "_blank", "width=400,height=600");
      popup.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: monospace; width: 80mm; margin: auto; font-size: 12px; }
            h4 { text-align: center; margin-bottom: 5px; }
            hr { border: none; border-top: 1px dashed #000; }
            table { width: 100%; border-collapse: collapse; }
            th, td { font-size: 12px; }
            .no-print { display: flex; justify-content: center; margin-top: 10px; gap: 8px; }
            @media print { .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          <h4>🐾 Pet Matters</h4>
          <p style="text-align:center;margin:0;">123 Main St, City</p>
          <p style="text-align:center;margin:0;">Tel: 0999-999-9999</p>
          <hr />
          <p><b>Transaction ID:</b> ${transactionId}</p>
          <p><b>Date:</b> ${new Date().toLocaleString()}</p>
          <p><b>Staff:</b> ${staffName}</p>
          <hr />
          <table>
            <thead>
              <tr>
                <th align="left">Item</th>
                <th align="right">Qty</th>
                <th align="right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((it) => {
                  const label =
                    nameByCode[it.product_code] || it.product_code || "";
                  return `
                  <tr>
                    <td>${label}</td>
                    <td align="right">${it.qty}</td>
                    <td align="right">₱${(it.qty * it.price).toFixed(2)}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
          <hr />
          <p><b>Total: ₱${totalAmount.toFixed(2)}</b></p>
          <p>Payments: ${payments
            .map((p) => `${p.method} ₱${Number(p.amount || 0).toFixed(2)}`)
            .join(", ")}</p>
          <hr />
          <p style="text-align:center;">Thank you for your purchase!</p>
          <div class="no-print">
            <button onclick="window.print()">🖨 Print</button>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
      </html>
    `);
      popup.document.close();

      // Optional: auto-trigger print
      popup.onload = () => popup.print();
    } catch (err) {
      console.error("Receipt print failed:", err.message);
      alert(`Failed to generate receipt: ${err.message}`);
    }
  };

  // 👇 Submit Transaction logic (unchanged, except we store the new ID)
  const handleSubmit = async () => {
    if (orders.length === 0) {
      alert("No items in the order.");
      return;
    }
    if (payments.length === 0) {
      alert("Please add at least one payment method.");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let staffName = null;
      if (user) {
        const { data: staff, error } = await supabase
          .from("staff")
          .select("staff_name")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        staffName = staff.staff_name;
      } else {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) throw new Error("No logged in user found");
        const parsedUser = JSON.parse(storedUser);
        staffName = parsedUser.staff_name;
      }

      const { data: trx, error: trxError } = await supabase
        .from("transactions")
        .insert([
          { total_amount: total, status: "completed", staff: staffName },
        ])
        .select()
        .single();

      if (trxError) throw trxError;

      const transactionId = trx.id;
      setLastTransactionId(transactionId); // 👈 store for printing

      // 4️⃣ Insert transaction_items (NO product_name column)
      const itemsData = orders.map((o) => ({
        transaction_id: transactionId,
        product_code: o.product_ID, // barcode / product_ID
        qty: o.qty,
        price: o.price,
        subtotal: o.qty * o.price,
      }));

      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(itemsData);

      if (itemsError) throw itemsError;

      const paymentsData = payments.map((p) => ({
        transaction_id: transactionId,
        method: p.method,
        amount: p.amount,
      }));

      const { error: paymentsError } = await supabase
        .from("transaction_payments")
        .insert(paymentsData);
      if (paymentsError) throw paymentsError;

      // FIFO stock update (unchanged)
      for (const order of orders) {
        let remainingQtyToReduce = order.qty;

        const { data: prodRows, error: fetchError } = await supabase
          .from("products")
          .select("id, product_quantity, product_expiry")
          .eq("product_ID", order.product_ID)
          .order("product_expiry", { ascending: true });

        if (fetchError) throw fetchError;

        for (const row of prodRows) {
          if (remainingQtyToReduce <= 0) break;

          const qtyToTake = Math.min(
            row.product_quantity,
            remainingQtyToReduce
          );

          const { error: updateError } = await supabase
            .from("products")
            .update({
              product_quantity: row.product_quantity - qtyToTake,
            })
            .eq("id", row.id);

          if (updateError) throw updateError;
          remainingQtyToReduce -= qtyToTake;
        }
      }

      alert("Transaction saved successfully!");
      setRefreshProducts((prev) => prev + 1);
      setTimeout(() => handlePrintReceipt(transactionId), 500);
    } catch (err) {
      console.error("Error saving transaction:", err.message);
      alert(`Failed to save transaction: ${err.message}`);
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col xs={12} md={4} lg={3} className="mb-3">
          <QuickReport refreshTrigger={refreshProducts} />
        </Col>

        <Col xs={12} md={8} lg={9} xl={9} className="mb-3">
          <ProductsAndServices
            onAddProduct={handleAddProduct}
            refreshTrigger={refreshProducts}
          />
        </Col>
      </Row>

      <Row>
        <Col xs={12} md={6} lg={6} xl={6} className="mb-3">
          <Order
            orders={orders}
            onQtyChange={handleQtyChange}
            onDelete={handleDelete}
          />
        </Col>

        <Col xs={12} md={6} lg={6} xl={6} className="mb-3">
          <Payments
            total={total}
            payments={payments}
            setPayments={setPayments}
          />

          <div className="d-flex justify-content-end gap-2 p-2">
            <Button variant="secondary" onClick={handleReset}>
              Reset
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default POS;
