import { useEffect, useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { FaBox } from "react-icons/fa";
import { supabase } from "../supabaseClient";

const SuggestedPurchase = () => {
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
  const fetchTopProducts = async () => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    // 1️⃣ Fetch completed transactions
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select(`
        id,
        created_at,
        status,
        transaction_items (
          product_code,
          qty
        )
      `)
      .eq("status", "completed")
      .gte("created_at", lastWeek.toISOString());

    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    // 2️⃣ Fetch products separately (ID → name mapping)
    const { data: products } = await supabase
      .from("products")
      .select("product_ID, product_name");

    const productMap = {};
    products?.forEach((p) => {
      productMap[p.product_ID] = p.product_name;
    });

    // 3️⃣ Count sales using product_name instead of ID
    const salesCount = {};
    transactions.forEach((t) =>
      t.transaction_items?.forEach((item) => {
        const qty = item.qty || 1;
        const name = productMap[item.product_code] || item.product_code; // fallback
        salesCount[name] = (salesCount[name] || 0) + qty;
      })
    );

    if (Object.keys(salesCount).length === 0) {
      setTopProducts(["No completed transactions in the last 7 days"]);
      return;
    }

    // 4️⃣ Sort top 3
    const sorted = Object.entries(salesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    setTopProducts(sorted.map(([name, qty]) => `${name} (Sold: ${qty})`));
  };

  fetchTopProducts();
}, []);


  return (
    <Container
      className="bg-white mt-4 mx-4 mb-0 rounded text-center"
      style={{ width: "360px" }}
    >
      <span className="mx-0 mt-3 mb-0 d-inline-block" style={{ fontWeight: "10px" }}>
        Suggested Purchases (Last 7 Days)
      </span>
      <Row>
        <Col md={12} className="border-end">
          <div className="d-flex flex-column align-items-center my-4">
            <FaBox />
            {topProducts.length > 0 ? (
              topProducts.map((p, idx) => (
                <span
                  key={idx}
                  className="mx-0 m-1 d-inline-block"
                  style={{ fontWeight: idx === 0 ? "bold" : "normal" }}
                >
                  {idx + 1}. {p}
                </span>
              ))
            ) : (
              <span>Loading...</span>
            )}
            <span className="mx-0 mt-2 d-inline-block">
              Top Selling Products (Weekly)
            </span>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default SuggestedPurchase;
