import { Container, Row, Col, Button, Spinner } from "react-bootstrap";
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
  const [lastTransactionId, setLastTransactionId] = useState(null); // store for printing
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for submit button

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

  // ----------------------------
  // PRINT RECEIPT (popup-safe)
  // ----------------------------
  const handlePrintReceipt = async (transactionIdParam) => {
    const transactionId = transactionIdParam || lastTransactionId;
    if (!transactionId) {
      alert("No recent transaction found to print.");
      return;
    }

    try {
      // 1) Items for this transaction
      const { data: items, error: itemsErr } = await supabase
        .from("transaction_items")
        .select("product_code, qty, price, subtotal")
        .eq("transaction_id", transactionId);

      if (itemsErr) throw itemsErr;
      if (!items || items.length === 0)
        throw new Error("No items found for this transaction.");

      // 2) Product names in one query
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

      // 3) Staff name (from localStorage)
      const storedUser = localStorage.getItem("user");
      let staffName = "Staff";
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          staffName = parsed.staff_name || "Staff";
        } catch {}
      }

      const totalAmount = items.reduce((sum, it) => sum + it.qty * it.price, 0);

      // Build the full HTML once
      const receiptHtml = `
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
                    const label = nameByCode[it.product_code] || it.product_code || "";
                    return `
                      <tr>
                        <td>${label}</td>
                        <td align="right">${it.qty}</td>
                        <td align="right">₱${(it.qty * it.price).toFixed(2)}</td>
                      </tr>`;
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
      `;

      // Try popup first; fallback to hidden iframe if blocked
      const popup = window.open("", "_blank", "width=400,height=600");
      if (popup && popup.document) {
        popup.document.open();
        popup.document.write(receiptHtml);
        popup.document.close();
        popup.onload = () => {
          try {
            popup.focus();
            popup.print();
          } catch {}
        };
      } else {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);

        iframe.onload = () => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } finally {
            setTimeout(() => document.body.removeChild(iframe), 1000);
          }
        };

        iframe.contentDocument.open();
        iframe.contentDocument.write(receiptHtml);
        iframe.contentDocument.close();
      }
    } catch (err) {
      console.error("Receipt print failed:", err.message);
      alert(`Failed to generate receipt: ${err.message}`);
    }
  };

  // Function to check stock availability before submitting
  const checkStockAvailability = async () => {
    const stockIssues = [];
    
    // Check each product in the order
    for (const order of orders) {
      // Get total available stock for this product
      const { data: productRows, error } = await supabase
        .from("products")
        .select("product_ID, product_name, product_quantity")
        .eq("product_ID", order.product_ID);
      
      if (error) {
        console.error("Error fetching stock:", error);
        stockIssues.push(`Error checking stock for ${order.product_name}`);
        continue;
      }
      
      if (!productRows || productRows.length === 0) {
        stockIssues.push(`${order.product_name}: Product not found in inventory`);
        continue;
      }
      
      // Sum up all quantities across batches
      const totalAvailableStock = productRows.reduce((sum, row) => sum + (row.product_quantity || 0), 0);
      
      if (totalAvailableStock < order.qty) {
        stockIssues.push(`${order.product_name}: Only ${totalAvailableStock} available, but ${order.qty} requested`);
      }
    }
    
    return stockIssues;
  };

  // ----------------------------
  // SUBMIT (with FIFO + logs + STOCK VALIDATION)
  // ----------------------------
  const handleSubmit = async () => {
    if (orders.length === 0) {
      alert("No items in the order.");
      return;
    }
    if (payments.length === 0) {
      alert("Please add at least one payment method.");
      return;
    }

    // Check if total payment is sufficient
    const discountRate = 0.2; // Assuming 20% discount if applied
    const discountedTotal = total * (1 - discountRate); // Adjust based on your discount logic
    const paymentTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    if (paymentTotal < discountedTotal) {
      alert(`Insufficient payment. Total: ₱${discountedTotal.toFixed(2)}, Paid: ₱${paymentTotal.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true); // Start loading

    try {
      // Check stock availability BEFORE processing transaction
      const stockIssues = await checkStockAvailability();
      
      if (stockIssues.length > 0) {
        // Show all stock issues in one alert
        alert(`Insufficient stock:\n\n${stockIssues.join('\n')}`);
        return;
      }

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

      // 1) transactions
      const { data: trx, error: trxError } = await supabase
        .from("transactions")
        .insert([{ total_amount: total, status: "completed", staff: staffName }])
        .select()
        .single();
      if (trxError) throw trxError;

      const transactionId = trx.id;
      setLastTransactionId(transactionId);

      // 2) transaction_items
      const itemsData = orders.map((o) => ({
        transaction_id: transactionId,
        product_code: o.product_ID,
        qty: o.qty,
        price: o.price,
        subtotal: o.qty * o.price,
      }));
      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(itemsData);
      if (itemsError) throw itemsError;

      // 3) transaction_payments
      const paymentsData = payments.map((p) => ({
        transaction_id: transactionId,
        method: p.method,
        amount: p.amount,
      }));
      const { error: paymentsError } = await supabase
        .from("transaction_payments")
        .insert(paymentsData);
      if (paymentsError) throw paymentsError;

      // 4) FIFO stock update + track earliest expiry actually used
      const firstExpiryUsedByCode = {}; // { [product_ID]: 'yyyy-mm-dd' }

      for (const order of orders) {
        let remainingQtyToReduce = order.qty;

        const { data: prodRows, error: fetchError } = await supabase
          .from("products")
          .select("id, product_quantity, product_expiry, product_ID")
          .eq("product_ID", order.product_ID)
          .order("product_expiry", { ascending: true });
        if (fetchError) throw fetchError;

        for (const row of prodRows) {
          if (remainingQtyToReduce <= 0) break;

          const qtyToTake = Math.min(row.product_quantity, remainingQtyToReduce);

          if (
            qtyToTake > 0 &&
            !firstExpiryUsedByCode[order.product_ID] &&
            row.product_expiry
          ) {
            const ymd = new Date(row.product_expiry).toISOString().split("T")[0];
            firstExpiryUsedByCode[order.product_ID] = ymd;
          }

          const { error: updateError } = await supabase
            .from("products")
            .update({ product_quantity: row.product_quantity - qtyToTake })
            .eq("id", row.id);
          if (updateError) throw updateError;

          remainingQtyToReduce -= qtyToTake;
        }
      }

      // 5) Insert logs (with nearest/first expiry used)
      try {
        const codes = [...new Set(orders.map((o) => o.product_ID))];
        const { data: prodMeta, error: metaErr } = await supabase
          .from("products")
          .select("id, product_ID, product_name, product_category, product_unit")
          .in("product_ID", codes);
        if (metaErr) throw metaErr;

        const metaByCode = {};
        (prodMeta || []).forEach((p) => {
          if (!metaByCode[p.product_ID]) metaByCode[p.product_ID] = p;
        });

        const logsPayload = orders.map((o) => {
          const meta = metaByCode[o.product_ID] || {};
          return {
            product_id: o.product_ID,
            product_name: meta.product_name || o.product_name || o.product_ID,
            product_quantity: o.qty,
            product_category: meta.product_category || null,
            product_unit: meta.product_unit || null,
            // 👇 nearest/first expiry batch consumed by FIFO
            product_expiry: firstExpiryUsedByCode[o.product_ID] || null,
            staff: staffName,
            product_action: "Sale",
            product_uuid: meta.id || null,
          };
        });

        const { error: logErr } = await supabase.from("logs").insert(logsPayload);
        if (logErr) {
          console.error("Failed to insert sale logs:", logErr.message);
          // do not throw — logging shouldn't block checkout
        }
      } catch (e) {
        console.error("Logging error:", e.message);
      }

      alert("Transaction saved successfully!");
      setRefreshProducts((prev) => prev + 1);

      // Auto-print after submit (works even if popup is blocked thanks to fallback)
      setTimeout(() => handlePrintReceipt(transactionId), 300);
    } catch (err) {
      console.error("Error saving transaction:", err.message);
      alert(`Failed to save transaction: ${err.message}`);
    } finally {
      setIsSubmitting(false); // Stop loading regardless of success/error
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
          <Payments total={total} payments={payments} setPayments={setPayments} />

          <div className="d-flex justify-content-end gap-2 p-2">
            <Button variant="secondary" onClick={handleReset} disabled={isSubmitting}>
              Reset
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              disabled={isSubmitting || orders.length === 0 || payments.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Processing...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default POS;