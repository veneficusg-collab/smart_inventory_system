import { Container, Row, Col, Button } from "react-bootstrap";
import { useState } from "react";
import QuickReport from "./quick-report";
import ProductsAndServices from "./products-and-services";
import Order from "./order";
import Payments from "./payments";
import { supabase } from "../supabaseClient"; // make sure you have supabase client setup

const POS = () => {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [refreshProducts, setRefreshProducts] = useState(0); // 👈 Add refresh trigger

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
          product_ID: product.product_ID, // barcode
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
  };

  const total = orders.reduce((sum, o) => sum + o.qty * o.price, 0);

  // 👇 Submit Transaction with FIFO expiry logic
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
      // 1️⃣ Try Supabase user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let staffName = null;

      if (user) {
        // Logged in via Supabase
        let { data: staff, error } = await supabase
          .from("staff")
          .select("staff_name")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        staffName = staff.staff_name;
      } else {
        // 2️⃣ Fallback: QR login
        const storedUser = localStorage.getItem("user");
        if (!storedUser) throw new Error("No logged in user found");

        const parsedUser = JSON.parse(storedUser);
        staffName = parsedUser.staff_name;
      }

      // 3️⃣ Insert transaction
      const { data: trx, error: trxError } = await supabase
        .from("transactions")
        .insert([
          { total_amount: total, status: "completed", staff: staffName },
        ])
        .select()
        .single();

      if (trxError) throw trxError;

      const transactionId = trx.id;

      // 4️⃣ Insert transaction_items
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

      // 5️⃣ Insert transaction_payments
      const paymentsData = payments.map((p) => ({
        transaction_id: transactionId,
        method: p.method,
        amount: p.amount,
      }));

      const { error: paymentsError } = await supabase
        .from("transaction_payments")
        .insert(paymentsData);

      if (paymentsError) throw paymentsError;

      // 6️⃣ FIFO stock update (your existing logic)
      for (const order of orders) {
        let remainingQtyToReduce = order.qty;

        const { data: prodRows, error: fetchError } = await supabase
          .from("products")
          .select("id, product_quantity, product_expiry")
          .eq("product_ID", order.product_ID)
          .order("product_expiry", { ascending: true });

        if (fetchError) throw fetchError;
        if (!prodRows || prodRows.length === 0) {
          throw new Error(`Product with ID ${order.product_ID} not found`);
        }

        const totalStock = prodRows.reduce(
          (sum, row) => sum + row.product_quantity,
          0
        );

        if (totalStock < remainingQtyToReduce) {
          throw new Error(
            `Not enough stock for ${order.product_name}. Available: ${totalStock}, Required: ${remainingQtyToReduce}`
          );
        }

        for (const row of prodRows) {
          if (remainingQtyToReduce <= 0) break;

          const qtyToTakeFromThisRow = Math.min(
            row.product_quantity,
            remainingQtyToReduce
          );

          const newQtyForThisRow = row.product_quantity - qtyToTakeFromThisRow;

          const { error: updateError } = await supabase
            .from("products")
            .update({ product_quantity: newQtyForThisRow })
            .eq("id", row.id);

          if (updateError) throw updateError;

          remainingQtyToReduce -= qtyToTakeFromThisRow;
        }

        if (remainingQtyToReduce > 0) {
          throw new Error(
            `Failed to fully reduce stock for ${order.product_name}. Remaining: ${remainingQtyToReduce}`
          );
        }
      }

      alert("Transaction saved successfully!");
      handleReset();
      setRefreshProducts((prev) => prev + 1);
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
          {/* 👇 Pass refresh trigger to ProductsAndServices */}
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
          {/* Pass payments + setter to Payments */}
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
